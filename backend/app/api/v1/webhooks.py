from fastapi import APIRouter

router = APIRouter(prefix="/api/v1/webhooks", tags=["webhooks"])


@router.post("/{channel}")
async def receive_webhook(channel: str):
    return {"data": {"channel": channel, "status": "received"}, "error": None}
