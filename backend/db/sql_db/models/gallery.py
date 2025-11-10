from tortoise import fields
from tortoise.models import Model
from datetime import datetime


class Gallery(Model):

    id = fields.IntField(pk=True, description="画廊id，主键")
    name = fields.CharField(max_length=100, description="画廊名称")
    created_time = fields.DatetimeField(
        default=datetime.now(), description="画廊创建时间"
    )
    description = fields.TextField(null=True, description="画廊描述信息")
    image_count = fields.IntField(default=0, description="画廊中图片数量")
    is_deleted = fields.BooleanField(
        default=False,
        description="画廊是否被删除,被删除的不会在检索中出现，只会出现在回收站中",
    )

    # 多对多关系
    image = fields.ManyToManyField(
        "image.image",
        related_name="galleries",
        through="gallery_image",
        description="画廊中的图片",
    )

    class GalleryMeta:
        table = "gallery"
