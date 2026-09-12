from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """
    Configuration for the SnapShare AI microservice.
    INTERNAL_SHARED_SECRET must match AI_SERVICE_SHARED_SECRET in the
    Node backend's .env — every request must present it, since this
    service should never be reachable directly from the internet.
    """

    internal_shared_secret: str = ""
    insightface_model_name: str = "buffalo_l"
    # ctx_id: -1 = CPU, 0+ = GPU device index. Most capstone deployments
    # will run CPU-only unless a GPU-backed host is available.
    ctx_id: int = -1
    detection_size: int = 640

    class Config:
        env_prefix = ""
        case_sensitive = False


settings = Settings()
