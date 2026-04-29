from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass


from app.models.tenant import Tenant  # noqa: E402, F401
from app.models.user import User  # noqa: E402, F401
from app.models.conversation import Conversation  # noqa: E402, F401
from app.models.message import Message  # noqa: E402, F401
from app.models.session import Session  # noqa: E402, F401
from app.models.agent import Agent  # noqa: E402, F401
from app.models.knowledge_item import KnowledgeItem  # noqa: E402, F401
from app.models.integration import Integration  # noqa: E402, F401
from app.models.channel_connection import ChannelConnection  # noqa: E402, F401
from app.models.event_log import EventLog  # noqa: E402, F401
