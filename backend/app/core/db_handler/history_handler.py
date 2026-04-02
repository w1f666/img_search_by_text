# backend/app/core/db_handler/history_handler.py
import uuid
from typing import List, Optional, Tuple
from db.sql_db.models.history import SearchSession, SearchTurn
from app.logs.config import logger  

class HistoryHandler:
    @staticmethod
    async def create_session(text_query: Optional[str] = None, reference_image_url: Optional[str] = None) -> SearchSession:
        """
        创建一个新的搜索会话
        如果提供了文本查询，默认将首轮文本查询作为标题，否则使用默认标题。
        """
        session_id = str(uuid.uuid4())
        
        # 确定标题规则
        if text_query:
            title = text_query[:50]  # 截取前50个字符作为标题
        elif reference_image_url:
            title = "图片搜索"
        else:
            title = "新的搜索"

        try:
            # 创建 Session
            session = await SearchSession.create(
                id=session_id,
                title=title,
                cover_image_url=reference_image_url
            )
            
            # 记录第一轮 Turn
            await SearchTurn.create(
                session=session,
                text_query=text_query,
                reference_image_url=reference_image_url,
                result_count=0  # 这里默认设为0，实际搜索完成后可以在其他地方更新
            )
            
            logger.info(f"成功创建新搜索会话 | ID: {session_id} | 标题: {title}")
            return session
        except Exception as e:
            logger.error(f"创建搜索会话失败 | Error: {str(e)}")
            raise

    @staticmethod
    async def add_search_turn(session_id: str, text_query: Optional[str] = None, reference_image_url: Optional[str] = None) -> Optional[SearchTurn]:
        """为已存在的会话追加一轮搜索轮次"""
        try:
            session = await SearchSession.get_or_none(id=session_id)
            if not session:
                logger.warning(f"尝试追加搜索轮次失败，找不到会话 | Session ID: {session_id}")
                return None
                
            turn = await SearchTurn.create(
                session=session,
                text_query=text_query,
                reference_image_url=reference_image_url
            )
            
            # 同时更新 Session 的 updated_at
            session.updated_at = turn.created_at
            await session.save(update_fields=["updated_at"])
            
            logger.info(f"成功追加搜索轮次 | Session ID: {session_id} | Turn ID: {turn.id}")
            return turn
        except Exception as e:
            logger.error(f"追加搜索轮次失败 | Session ID: {session_id} | Error: {str(e)}")
            raise

    @staticmethod
    async def get_sessions(page: int = 1, page_size: int = 20, keyword: Optional[str] = None) -> Tuple[int, List[SearchSession]]:
        """获取所有搜图历史记录(分页+关键字搜索)"""
        try:
            query = SearchSession.all().order_by("-updated_at")
            
            if keyword:
                # 搜索标题中包含关键字的记录
                query = query.filter(title__icontains=keyword)

            total_count = await query.count()
            
            # 分页
            sessions = await query.offset((page - 1) * page_size).limit(page_size)
            
            logger.debug(f"获取历史记录列表 | 页码: {page}, 每页: {page_size}, 关键字: '{keyword}', 匹配总数: {total_count}")
            return total_count, sessions
        except Exception as e:
            logger.error(f"获取历史记录列表失败 | Error: {str(e)}")
            raise

    @staticmethod
    async def get_session_by_id(session_id: str) -> Optional[SearchSession]:
        """获取单个会话的详细信息（连同它所有的搜索轮次一起获取）"""
        try:
            session = await SearchSession.get_or_none(id=session_id).prefetch_related("turns")
            if session:
                logger.debug(f"成功获取历史记录详情 | Session ID: {session_id}, 包含轮次: {len(session.turns)}")
            else:
                logger.warning(f"获取历史记录详情失败，未找到对应会话 | Session ID: {session_id}")
            return session
        except Exception as e:
            logger.error(f"获取历史记录详情异常 | Session ID: {session_id}, Error: {str(e)}")
            raise

    @staticmethod
    async def update_session_title(session_id: str, new_title: str) -> Optional[SearchSession]:
        """修改会话(历史记录)标题"""
        try:
            session = await SearchSession.get_or_none(id=session_id)
            if session:
                old_title = session.title
                session.title = new_title
                await session.save()
                logger.info(f"成功修改历史记录标题 | Session ID: {session_id} | '{old_title}' -> '{new_title}'")
                return session
            
            logger.warning(f"修改标题失败，未找到该历史记录 | Session ID: {session_id}")
            return None
        except Exception as e:
            logger.error(f"修改历史记录标题异常 | Session ID: {session_id}, Error: {str(e)}")
            raise

    @staticmethod
    async def delete_session(session_id: str) -> bool:
        """删除一条历史记录"""
        try:
            deleted_count = await SearchSession.filter(id=session_id).delete()
            if deleted_count > 0:
                logger.info(f"成功删除历史记录 | Session ID: {session_id}")
                return True
            else:
                logger.warning(f"删除历史记录无匹配项 | Session ID: {session_id}")
                return False
        except Exception as e:
            logger.error(f"删除历史记录异常 | Session ID: {session_id}, Error: {str(e)}")
            raise

    @staticmethod
    async def clear_all_sessions() -> int:
        """清空所有的历史记录"""
        try:
            deleted_count = await SearchSession.all().delete()
            logger.info(f"已清空所有历史记录 | 删除了 {deleted_count} 条会话")
            return deleted_count
        except Exception as e:
            logger.error(f"清空所有历史记录异常 | Error: {str(e)}")
            raise