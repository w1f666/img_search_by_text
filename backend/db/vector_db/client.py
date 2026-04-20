import chromadb
import os

from chromadb.config import Settings
from chromadb.utils import embedding_functions

DB_FOLDER = "db/vector_db/storage"
os.makedirs(DB_FOLDER, exist_ok=True)

client = chromadb.PersistentClient(path=DB_FOLDER);

collection = client.get_or_create_collection(
    name="image_vectors",
    metadata={"hnsw:space": "cosine"},
)
