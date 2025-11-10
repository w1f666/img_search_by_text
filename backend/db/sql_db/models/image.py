from tortoise.models import Model
from tortoise import fields
from datetime import datetime


class Image(Model):
    #默认启用自增主键
    id = fields.IntField(
        pk=True, 
        description="图片id，主键")
    upload_time = fields.DatetimeField(
        default=datetime.now, 
        description="图片上传时间"
    )
    file_path = fields.CharField(max_length=255, 
                                 description="图片url")
    file_hash = fields.CharField(
        max_length=64, 
        unique=True, 
        null=True, 
        description="图片文件hash值,用于去重"
    )
    p_hash = fields.CharField(
        max_length=64,
        null=True,
        index=True,
        description="图片感知hash值,用于相似图片检索以及去重",
    )
    description = fields.TextField(
        null=True, 
        description="图片描述信息")
    is_deleted = fields.BooleanField(
        default=False,
        description="图片是否被删除,被删除的不会在检索和相册中出现，只会出现在回收站中",
    )

    # # 多对多关系
    # gallery = fields.ManyToManyField(
    #     "models.gallery",
    #     related_name="images",
    #     through="gallery_image",
    #     description="图片所属画廊",
    # )

    # If you need to specify metadata, uncomment and configure the Meta class below.
    # class Meta:
    #     table = "image"
