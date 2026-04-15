from pydantic import BaseModel
from typing import Optional


class RenameSessionRequest(BaseModel):
    title: str
