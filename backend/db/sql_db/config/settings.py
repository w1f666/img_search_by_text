import os

DB_FOLDER = "backend/db/sql_db/storage" 
if not os.path.exists(DB_FOLDER):
    os.makedirs(DB_FOLDER)
    
TORTOISE_ORM = {
    "connections": {
        "default": "sqlite://" + os.path.join(DB_FOLDER, "db.sqlite3")  # 指定使用 aiosqlite 连接到名为 db.sqlite3 的文件
    },
    "apps": {
        # 这里做了一些修改，不然image会被覆盖
        #"models": {
        #    # generate_schemas=True 表示在启动时自动建表
        #    "models": ["db.sql_db.models.image"],
        #    "models": ["db.sql_db.models.gallery"],
        #    "default_connection": "default",
        #}
        
        "models": {
            # generate_schemas=True 表示在启动时自动建表
            "models": [
                "db.sql_db.models.image",
                "db.sql_db.models.gallery",
                "db.sql_db.models.ImageGalleryTrash",
            ],
            "default_connection": "default",
        }

    },
}
 