import os

DB_FOLDER = "backend/db/sql_db/storage"
if not os.path.exists(DB_FOLDER):
    os.makedirs(DB_FOLDER)

TORTOISE_ORM = {
    "connections": {
        "default": "sqlite://" + os.path.join(DB_FOLDER, "db.sqlite3")
    },
    "apps": {
        "models": {
            "models": [
                "db.sql_db.models.image",
                "db.sql_db.models.gallery",
                "db.sql_db.models.search_session",
            ],
            "default_connection": "default",
        }
    },
}
 