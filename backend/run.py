from app import create_app
from app.config import Config

app = create_app()

if __name__ == '__main__':
    # Launch application using settings from configuration environment
    app.run(
        host=Config.HOST,
        port=Config.PORT,
        debug=True
    )
