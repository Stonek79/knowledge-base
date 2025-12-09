FROM postgres:15-alpine


EXPOSE 5432

# Health check - используем переменные окружения
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD pg_isready -U $POSTGRES_USER -d $POSTGRES_DB

