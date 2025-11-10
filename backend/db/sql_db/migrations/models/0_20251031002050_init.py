from tortoise import BaseDBAsyncClient

RUN_IN_TRANSACTION = True


async def upgrade(db: BaseDBAsyncClient) -> str:
    return """
        CREATE TABLE IF NOT EXISTS "image" (
    "id" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL /* 图片id，主键 */,
    "upload_time" TIMESTAMP NOT NULL DEFAULT '2025-10-31T00:20:50.773187' /* 图片上传时间 */,
    "file_path" VARCHAR(255) NOT NULL /* 图片url */,
    "file_hash" VARCHAR(64) UNIQUE /* 图片文件hash值,用于去重 */,
    "p_hash" VARCHAR(64) /* 图片感知hash值,用于相似图片检索以及去重 */,
    "description" TEXT /* 图片描述信息 */,
    "is_deleted" INT NOT NULL DEFAULT 0 /* 图片是否被删除,被删除的不会在检索和相册中出现，只会出现在回收站中 */
);
CREATE INDEX IF NOT EXISTS "idx_image_p_hash_489d74" ON "image" ("p_hash");
CREATE TABLE IF NOT EXISTS "aerich" (
    "id" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    "version" VARCHAR(255) NOT NULL,
    "app" VARCHAR(100) NOT NULL,
    "content" JSON NOT NULL
);"""


async def downgrade(db: BaseDBAsyncClient) -> str:
    return """
        """


MODELS_STATE = (
    "eJztl1lv2zgQgP+KoacUcAKJOpM3O+ttUyT2InW7RetCoEXKFqKrErVNUOS/d4ayost2nb"
    "TZdoF9Meg5KPIbDmf4VYkSxsP8JIjoiitng69KTCMctBXDgULTtBajQNBlKC1rk2UuMuoJ"
    "EPo0zDmIGM+9LEhFkMQgjYswRGHigWEQr2pREQefC+6KZMXFmmeg+PgJxEHM+C3Pq7/pje"
    "sHPGSthQYMvy3lrrhLpewiFn9KQ/za0vWSsIji2ji9E+skfrAOYoHSFY95RgXH6UVW4PJx"
    "dZttVjsqV1qblEts+DDu0yIUje22GCiLwrR8vihsYtgBWxS+r3qLwuD6clGcmkSS3ELIS2"
    "KkC2vN5fZluI6JZtiGo1uGAyZynQ8S+77cfE2mdJR8pnPlXuqpoKWFhFxTLdIwoeAWRLyP"
    "9w+ghJrtjDuuHdhs43tSDbroK9D72FeCGn594Cr6ClGJeaypx7o2UNUzop6Z6olt65pjK/"
    "ujgtFQKfz6RF0UlulbGBnfOCwye7DPL64mb+ajq79wpijPP4eS5mg+QQ2R0ruO9Mh6gfIE"
    "EqtMt4dJBn9fzF8N8O/gw2w6kayTXKwy+cXabv5BwTXRQiRunHxxKWsCq8SVCEzrU+AHIX"
    "dTKtb9M3C+ptn2+LecOtEHUM8V7+9nW5GFByZXRG/dkMcr2ANklGnuiem70fX5q9H1EVh1"
    "AjXdqEipu++TXdP88WQrpyeR3dxRP/USwxRxZNL4Fi4OdKruDUFpEgfFDhia+hLvN81jTw"
    "mBZRwQAcvYGQBUtfmnj4af/lzy/SP9NPSa5sPY5uZO9Lbl49jXvY6r48H1ZjNC0JKbGCSP"
    "/n6hau6/F685v91R6jtuzxS0p9xDgF73IGoOlH4MDNdAolr+j9eXyft5q7RUWI+uRu9ftM"
    "rL5Wz6sjJvhOH8cjbu4A9yF1o+jox69MdJEnIa7+i1Wo4d/kvwfK5KsL357IbAIhAC0yBQ"
    "3B2Hwok3CZb7U8syhn0RppFjyM6AYcw0TBQbk6yZRqbheFXCmZoj+zrCcOyDva0v1arfM3"
    "VOH+ZpaMs5TYtxvFZ1WJxN2Wk5zw+fj/Fsdtk6H+OL7gF4ezWeXB9p8rCAUSB43S9iC+7f"
    "NNpFFCypd/OFZsztaRKS7LLtqyISdSU0hncF2+wTd7V5kox4FnhrZctjZaPZ+1qhtc3/z5"
    "XvX1y7GfzLD5J/eJZvrQC7K3bD5Re3oYdTfP7OE1PjERA35v9NgJqqHgAQrHYClLo2QPii"
    "4GUOtiG+fjObbofYcOmAfBvDBj+ywBPDQRjk4tPviXUPRdz1/qaj218M2w9VnGD8q8vL/T"
    "eLMQXS"
)
