import urllib.parse
import httpx
from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import RedirectResponse
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.config import settings
from app.core.database import get_db
from app.core.security import create_access_token, encrypt_token
from app.models.user import UserResponse
from app.services.user_service import UserService
from app.api.v1.dependencies import get_current_user
from app.models.user import UserModel

router = APIRouter()


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
    """Handle GitHub OAuth callback: exchange code, create/update user, redirect to frontend."""
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

    # 4. Generate JWT token
    jwt_token = create_access_token(data={"sub": user.user_id})

    # 5. Build user response (no sensitive data)
    user_response = UserResponse(
        user_id=user.user_id,
        email=user.email,
        name=user.name,
        avatar_url=user.avatar_url,
        github_username=user.github_username,
        created_at=user.created_at,
    )

    # 6. Redirect to frontend callback page with token and user data
    user_json = urllib.parse.quote(user_response.model_dump_json())
    redirect_url = f"{settings.FRONTEND_URL}/callback?token={jwt_token}&user={user_json}"
    return RedirectResponse(url=redirect_url, status_code=status.HTTP_302_FOUND)


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: UserModel = Depends(get_current_user)):
    """Get current authenticated user profile."""
    return UserResponse(
        user_id=current_user.user_id,
        email=current_user.email,
        name=current_user.name,
        avatar_url=current_user.avatar_url,
        github_username=current_user.github_username,
        created_at=current_user.created_at,
    )
