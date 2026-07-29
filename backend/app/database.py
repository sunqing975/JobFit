from sqlmodel import SQLModel, Session, create_engine

DATABASE_URL = "sqlite:///./jobfit.db"

engine = create_engine(DATABASE_URL, echo=False)


def init_db():
    SQLModel.metadata.create_all(engine)


def get_db():
    with Session(engine) as session:
        yield session
