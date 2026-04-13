from tortoise import fields
from tortoise.models import Model


class Gallery(Model):
    id = fields.IntField(pk=True)
    name = fields.CharField(max_length=100)
    description = fields.TextField(null=True, default="")
    cover_image_url = fields.CharField(max_length=500, null=True)
    image_count = fields.IntField(default=0)
    created_at = fields.DatetimeField(auto_now_add=True)
    updated_at = fields.DatetimeField(auto_now=True)

    class Meta:
        table = "gallery"

