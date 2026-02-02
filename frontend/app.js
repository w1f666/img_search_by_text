import { createApp, ref, reactive } from 'vue';

const API_BASE_URL = 'http://localhost:8080';

createApp({
    setup() {
        // 状态定义
        const currentTab = ref('search'); // 'search' or 'management'
        const searchType = ref('text'); // 'text' or 'image'
        const searchQuery = ref('');
        const topK = ref(5);
        const loading = ref(false);
        const searchResults = ref([]);
        const searched = ref(false);
        const errorMessage = ref('');
        
        // 管理面板状态
        const imagePathsInput = ref('');
        const addResult = ref(null);

        // 文件上传引用
        const fileInput = ref(null);
        const selectedFile = ref(null);

        // 处理文件选择
        const handleFileSelect = (event) => {
            selectedFile.value = event.target.files[0];
        };

        // 执行搜索
        const performSearch = async () => {
            loading.value = true;
            searchResults.value = [];
            searched.value = false;
            errorMessage.value = '';

            try {
                let response;
                if (searchType.value === 'text') {
                    if (!searchQuery.value.trim()) {
                        throw new Error("请输入搜索内容");
                    }
                    // 文本搜索
                    response = await axios.post(`${API_BASE_URL}/search/search_by_text`, null, {
                        params: {
                            query: searchQuery.value,
                            top_k: topK.value
                        }
                    });
                } else {
                    if (!selectedFile.value) {
                        throw new Error("请选择一张图片");
                    }
                    // 图片搜索
                    const formData = new FormData();
                    formData.append('uploaded_file', selectedFile.value);
                    
                    response = await axios.post(`${API_BASE_URL}/search/search_by_image`, formData, {
                        params: {
                            top_k: topK.value
                        },
                        headers: {
                            'Content-Type': 'multipart/form-data'
                        }
                    });
                }

                if (response.data && response.data.results) {
                    searchResults.value = response.data.results.map(item => ({
                        ...item,
                        image_load_error: false
                    }));
                } else {
                    searchResults.value = [];
                }
                searched.value = true;

            } catch (error) {
                console.error("Search error:", error);
                errorMessage.value = error.response?.data?.detail || error.message || "搜索发生错误";
            } finally {
                loading.value = false;
            }
        };

        // 添加图片
        const addImages = async () => {
            loading.value = true;
            addResult.value = null;
            errorMessage.value = '';

            try {
                const paths = imagePathsInput.value
                    .split('\n')
                    .map(p => p.trim())
                    .filter(p => p);

                if (paths.length === 0) {
                    throw new Error("请输入至少一个图片路径");
                }

                const response = await axios.post(`${API_BASE_URL}/management/add`, {
                    file_path: paths
                });

                addResult.value = response.data;
                imagePathsInput.value = ''; // 清空输入

            } catch (error) {
                console.error("Add images error:", error);
                errorMessage.value = error.response?.data?.detail || error.message || "添加图片失败";
            } finally {
                loading.value = false;
            }
        };

        // 图片加载错误处理
        const handleImageError = (event) => {
            // 找到对应的 item 并标记错误，以便显示 fallback 文本
            // 这里简单处理，直接隐藏 img 标签显示父容器背景或文字
            event.target.style.display = 'none';
            // 实际上应该更新数据状态，但 event 很难反查到 item
            // 可以通过 DOM 操作显示兄弟元素
            if (event.target.nextElementSibling) {
                event.target.nextElementSibling.style.display = 'block';
            }
        };

        // 获取图片 URL
        const getImageUrl = (filePath) => {
            // 如果是网络图片直接返回
            if (filePath.startsWith('http')) {
                return filePath;
            }
            // 如果是本地路径，浏览器无法直接访问 file://
            // 这里只是为了演示，如果后端没有静态服务，这个链接是打不开的
            // 除非用户安装了允许本地文件访问的扩展或配置
            return filePath; 
        };

        return {
            currentTab,
            searchType,
            searchQuery,
            topK,
            loading,
            searchResults,
            searched,
            errorMessage,
            imagePathsInput,
            addResult,
            fileInput,
            handleFileSelect,
            performSearch,
            addImages,
            handleImageError,
            getImageUrl
        };
    }
}).mount('#app');
