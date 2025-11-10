# API 路由管理
def auto_register_api(app, api_modules):
    for module in api_modules:
        app.register_blueprint(module.bp)