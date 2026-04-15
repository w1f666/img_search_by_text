from tortoise.models import Model
from tortoise import fields


class SearchSession(Model):
    id = fields.IntField(pk=True)
    session_id = fields.CharField(max_length=100, unique=True, index=True)
    title = fields.CharField(max_length=255, default="")
    created_at = fields.DatetimeField(auto_now_add=True)
    updated_at = fields.DatetimeField(auto_now=True)

    class Meta:
        table = "search_session"


class SearchTurn(Model):
    id = fields.IntField(pk=True)
    session = fields.ForeignKeyField(
        "models.SearchSession", related_name="turns", on_delete=fields.CASCADE
    )
    query_type = fields.CharField(max_length=10)
    text_query = fields.TextField(null=True)
    image_url = fields.CharField(max_length=500, null=True)
    matched_image_id = fields.IntField(null=True)
    created_at = fields.DatetimeField(auto_now_add=True)

    class Meta:
        table = "search_turn"
