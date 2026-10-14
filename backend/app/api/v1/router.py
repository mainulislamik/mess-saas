from fastapi import APIRouter
from app.api.v1.auth import router as auth_router
from app.api.v1.messes import router as messes_router
from app.api.v1.meals import router as meals_router
from app.api.v1.bazars import router as bazars_router
from app.api.v1.deposits import router as deposits_router
from app.api.v1.fixed_costs import router as fixed_costs_router
from app.api.v1.closings import router as closings_router
from app.api.v1.dashboard import router as dashboard_router
from app.api.v1.platform import router as platform_router

api_router = APIRouter()
api_router.include_router(auth_router)
api_router.include_router(messes_router)
api_router.include_router(meals_router)
api_router.include_router(bazars_router)
api_router.include_router(deposits_router)
api_router.include_router(fixed_costs_router)
api_router.include_router(closings_router)
api_router.include_router(dashboard_router)
api_router.include_router(platform_router)
