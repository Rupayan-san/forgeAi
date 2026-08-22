import urllib.parse
import httpx
from fastapi import APIRouter, Depends, HTTPException, status, Query, Cookie, Request
from fastapi.responses import RedirectResponse, JSONResponse
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.config import settings
from app.core.database import get_db
from app.core.security import create_access_token, encrypt_token
from app.models.user import UserResponse, TokenPairResponse
from app.services.user_service import UserService
from app.api.v1.dependencies import get_current_user
from app.models.user import UserModel

router = APIRouter()

# Cookie settings for refresh token
REFRESH_COOKIE_NAME = "forge_refresh_token"
REFRESH_COOKIE_MAX_AGE = settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60  # seconds
COOKIE_SECURE = not settings.DEBUG  # True in production (HTTPS), False in dev (HTTP)


def _set_refresh_cookie(response, raw_token: str):
    """Set the refresh token as an HttpOnly cookie on the response."""
    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=raw_token,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite="lax",
        max_age=REFRESH_COOKIE_MAX_AGE,
        path="/",
    )


def _clear_refresh_cookie(response):
    """Clear the refresh token cookie."""
    response.delete_cookie(
        key=REFRESH_COOKIE_NAME,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite="lax",
        path="/",
    )


def _build_user_response(user: UserModel) -> UserResponse:
    """Build a safe user response (no sensitive data)."""
    return UserResponse(
        user_id=user.user_id,
        email=user.email,
        name=user.name,
        avatar_url=user.avatar_url,
        github_username=user.github_username,
        created_at=user.created_at,
    )


@router.get("/github/login")
async def github_login():
    """Redirect user to GitHub OAuth authorization page."""
    params = urllib.parse.urlencode({
        "client_id": settings.GITHUB_CLIENT_ID,
        "redirect_uri": settings.GITHUB_REDIRECT_URI,
        "scope": "user repo",
        "state": "forge_auth",
    })
    return RedirectResponse(
        url=f"https://github.com/login/oauth/authorize?{params}",
        status_code=status.HTTP_302_FOUND,
    )


@router.get("/github/callback")
async def github_callback(
    code: str = Query(...),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Handle GitHub OAuth callback: exchange code, create/update user, issue tokens."""
    # 1. Exchange code for access token
    async with httpx.AsyncClient() as client:
        token_res = await client.post(
            "https://github.com/login/oauth/access_token",
            data={
                "client_id": settings.GITHUB_CLIENT_ID,
                "client_secret": settings.GITHUB_CLIENT_SECRET,
                "code": code,
                "redirect_uri": settings.GITHUB_REDIRECT_URI,
            },
            headers={"Accept": "application/json"},
        )
        token_data = token_res.json()
        github_access_token = token_data.get("access_token")

        if not github_access_token:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=token_data.get("error_description", "Failed to get access token"),
            )

        # 2. Fetch GitHub user profile
        user_res = await client.get(
            "https://api.github.com/user",
            headers={"Authorization": f"Bearer {github_access_token}"},
        )
        gh_user = user_res.json()

    # 3. Create or update user in MongoDB
    user_service = UserService(db)
    user = await user_service.upsert_by_github_id(
        github_id=gh_user["id"],
        user_data={
            "github_id": gh_user["id"],
            "github_username": gh_user["login"],
            "name": gh_user.get("name") or gh_user["login"],
            "email": gh_user.get("email"),
            "avatar_url": gh_user.get("avatar_url"),
            "github_access_token": encrypt_token(github_access_token),
        },
    )

    # 4. Generate access token (short-lived JWT)
    jwt_token = create_access_token(data={"sub": user.user_id})

    # 5. Generate refresh token (long-lived, stored in MongoDB)
    raw_refresh_token = await user_service.store_refresh_token(user.user_id)

    # 6. Build redirect to frontend with access token and user data
    user_response = _build_user_response(user)
    user_json = urllib.parse.quote(user_response.model_dump_json())
    redirect_url = f"{settings.FRONTEND_URL}/callback?token={jwt_token}&user={user_json}"

    response = RedirectResponse(url=redirect_url, status_code=status.HTTP_302_FOUND)
    _set_refresh_cookie(response, raw_refresh_token)
    return response


@router.post("/refresh")
async def refresh_token(
    request: Request,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Use a refresh token (from HttpOnly cookie) to get a new access token."""
    raw_token = request.cookies.get(REFRESH_COOKIE_NAME)

    if not raw_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No refresh token provided",
        )

    user_service = UserService(db)

    # Validate the refresh token
    user_id = await user_service.validate_refresh_token(raw_token)
    if not user_id:
        response = JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={"detail": "Invalid or expired refresh token"},
        )
        _clear_refresh_cookie(response)
        return response

    # Get the user
    user = await user_service.get_by_id(user_id)
    if not user:
        response = JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={"detail": "User not found"},
        )
        _clear_refresh_cookie(response)
        return response

    # Rotate: revoke old token, issue new one (prevents replay attacks)
    new_raw_token = await user_service.rotate_refresh_token(raw_token, user_id)
    if not new_raw_token:
        # Rotation failed — token may have already been revoked (potential theft)
        await user_service.revoke_all_user_tokens(user_id)
        response = JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={"detail": "Token reuse detected, all sessions revoked"},
        )
        _clear_refresh_cookie(response)
        return response

    # Issue new access token
    new_access_token = create_access_token(data={"sub": user.user_id})

    user_response = _build_user_response(user)
    response = JSONResponse(
        content=TokenPairResponse(
            access_token=new_access_token,
            user=user_response,
        ).model_dump(mode="json"),
    )
    _set_refresh_cookie(response, new_raw_token)
    return response


@router.post("/logout")
async def logout(
    request: Request,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Logout: revoke refresh token and clear cookie."""
    raw_token = request.cookies.get(REFRESH_COOKIE_NAME)

    if raw_token:
        user_service = UserService(db)
        await user_service.revoke_refresh_token(raw_token)

    response = JSONResponse(content={"message": "Logged out successfully"})
    _clear_refresh_cookie(response)
    return response


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: UserModel = Depends(get_current_user)):
    """Get current authenticated user profile."""
    return _build_user_response(current_user)
