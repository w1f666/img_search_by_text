from tortoise import fields
from tortoise.models import Model


class ImageGalleryTrash(Model):

    id = fields.IntField(pk=True)

    image = fields.ForeignKeyField(
        "models.Image",
        related_name="trash_records",
        on_delete=fields.CASCADE
    )

    gallery = fields.ForeignKeyField(
        "models.Gallery",
        related_name="trash_records",
        on_delete=fields.CASCADE
    )

    deleted_time = fields.DatetimeField(
        auto_now_add=True
    )

    restored = fields.BooleanField(
        default=False
    )

    class ImageGalleryTrashMeta:
        table = "image_gallery_trash"