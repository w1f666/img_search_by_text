import uuid
from tortoise.models import Model
from tortoise import fields

class SearchSession(Model):
    """
    搜索会话 (Search Session)
    对应一条搜索历史记录，包含完整的上下文。
    """
    # 推荐使用 uuid 作为会话 ID (在 URL 等地方传递会安全些，也符合前端常见习惯)，也可以改回自增
    id = fields.CharField(pk=True, max_length=64, description="会话ID，主键")
    title = fields.CharField(max_length=255, description="会话标题 (默认为首轮查询词)")
    created_at = fields.DatetimeField(auto_now_add=True, description="记录创建时间")
    updated_at = fields.DatetimeField(auto_now=True, description="历史记录的最后更新时间")
    cover_image_url = fields.CharField(max_length=512, null=True, description="该会话的展示封面缩略图地址")

    class Meta:
        table = "search_session"


class SearchTurn(Model):
    """
    搜索轮次 (Search Turn)
    对应某次会话下的连续检索行为及参数，以支持多轮搜图 (文本精炼/识图叠加等)。
    """
    id = fields.IntField(pk=True, description="搜索轮次ID(自增)")
    # 外键关联到 SearchSession，同时会在 Session 对象身上自动生成 turns 属性 (通过 related_name)
    session = fields.ForeignKeyField(
        "models.SearchSession", 
        related_name="turns", 
        on_delete=fields.CASCADE, # 级联删除：清空历史记录时自动清空底下的关联轮次
        description="所属会话"
    )
    text_query = fields.TextField(null=True, description="本轮输入的文字条件")
    reference_image_url = fields.CharField(max_length=512, null=True, description="本轮传入的参考图片路径")
    
    # 记录当次查询究竟返回了多少个结果（辅助数据）
    result_count = fields.IntField(default=0, description="本轮检索查出的结果数")
    created_at = fields.DatetimeField(auto_now_add=True, description="此轮操作的精确时间")

    class Meta:
        table = "search_turn"