from tortoise.models import Model
from tortoise import fields


class Image(Model):
    id = fields.IntField(pk=True)
    filename = fields.CharField(max_length=255, default="")
    image_url = fields.CharField(max_length=500, default="")
    thumbnail_url = fields.CharField(max_length=500, null=True)
    size_bytes = fields.IntField(default=0)
    size_label = fields.CharField(max_length=20, default="0 KB")
    created_at = fields.DatetimeField(auto_now_add=True)
    gallery_id = fields.IntField(null=True)
    status = fields.CharField(max_length=10, default="active")
    source = fields.CharField(max_length=10, default="upload")
    deleted_at = fields.DatetimeField(null=True)
    # CLIP / hash fields (used by duplicate detection and vector search)
    file_path = fields.CharField(max_length=500, null=True)
    file_hash = fields.CharField(max_length=64, null=True)
    p_hash = fields.CharField(max_length=64, null=True, index=True)
    phash_p1 = fields.CharField(max_length=16, null=True, index=True)
    phash_p2 = fields.CharField(max_length=16, null=True, index=True)
    phash_p3 = fields.CharField(max_length=16, null=True, index=True)
    phash_p4 = fields.CharField(max_length=16, null=True, index=True)
    description = fields.TextField(null=True)

    class Meta:
        table = "image"
