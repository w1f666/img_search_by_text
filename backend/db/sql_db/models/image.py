from tortoise.models import Model
from tortoise import fields
from datetime import datetime


class Image(Model):
    #默认启用自增主键
    id = fields.IntField(
        pk=True, 
        description="图片id，主键")
    # upload_time = fields.DatetimeField(
    #     default=datetime.now, 
    #     description="图片上传时间"
    # )
    # file_path = fields.CharField(max_length=255, 
    #                              description="图片url")
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
    #用于汉明距离计算
    phash_p1 = fields.CharField(max_length=16, null=True, index=True)
    phash_p2 = fields.CharField(max_length=16, null=True, index=True)
    phash_p3 = fields.CharField(max_length=16, null=True, index=True)
    phash_p4 = fields.CharField(max_length=16, null=True, index=True)
    description = fields.TextField(
        null=True, 
        description="图片描述信息")
    # is_deleted = fields.BooleanField(
    #     default=False,
    #     description="图片是否被删除,被删除的不会在检索和相册中出现，只会出现在回收站中",
    # )
    
    # ===== 新增：前端需要的字段 =====
    filename = fields.CharField(max_length=255,null=True,description="图片文件名")
    image_url = fields.CharField(max_length=255,null=True,description="图片访问URL")
    thumbnail_url = fields.CharField(max_length=255,null=True,description="缩略图URL")
    size_bytes = fields.IntField(null=True,description="图片大小（字节）")
    size_label = fields.CharField(max_length=50,null=True,description="图片大小（字符串，如3.2MB）")
    created_at = fields.DatetimeField(null=True,description="创建时间（用于前端）")
    status = fields.CharField(max_length=20,default="active",description="图片状态：active 或 trash")
    source = fields.CharField(max_length=20,default="upload",description="来源：upload / scan")  # 先保留
    deleted_at = fields.DatetimeField(null=True,description="删除时间（用于回收站）")
    
    # 一对多结构
    gallery = fields.ForeignKeyField(
    "models.Gallery",
    related_name="images",
    null=True,
    on_delete=fields.SET_NULL
)

    class ImageMeta:
        table = "image"
