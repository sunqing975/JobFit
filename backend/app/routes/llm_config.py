from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from ..database import get_db
from ..models import LLMConfig
from ..schemas import LLMConfigCreate, LLMConfigUpdate, LLMConfigResponse

router = APIRouter(prefix="/api/llm-config", tags=["LLM Config"])


@router.get("/", response_model=list[LLMConfigResponse])
def list_configs(db: Session = Depends(get_db)):
    configs = db.exec(select(LLMConfig)).all()
    return configs


@router.get("/active", response_model=LLMConfigResponse)
def get_active_config(db: Session = Depends(get_db)):
    config = db.exec(select(LLMConfig).where(LLMConfig.is_active == True)).first()
    if not config:
        raise HTTPException(status_code=404, detail="未找到激活的模型配置")
    return config


@router.post("/", response_model=LLMConfigResponse)
def create_config(data: LLMConfigCreate, db: Session = Depends(get_db)):
    has_active = db.exec(
        select(LLMConfig).where(LLMConfig.is_active == True)
    ).first()

    config = LLMConfig(
        provider_name=data.provider_name,
        api_base=data.api_base,
        api_key=data.api_key,
        model_name=data.model_name,
        temperature=data.temperature,
        is_active=not has_active,
    )
    db.add(config)
    db.commit()
    db.refresh(config)
    return config


@router.put("/{config_id}", response_model=LLMConfigResponse)
def update_config(config_id: int, data: LLMConfigUpdate, db: Session = Depends(get_db)):
    config = db.get(LLMConfig, config_id)
    if not config:
        raise HTTPException(status_code=404, detail="配置不存在")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        if value is not None:
            setattr(config, key, value)

    if data.is_active:
        others = db.exec(
            select(LLMConfig).where(
                LLMConfig.is_active == True, LLMConfig.id != config_id
            )
        ).all()
        for other in others:
            other.is_active = False

    db.add(config)
    db.commit()
    db.refresh(config)
    return config


@router.delete("/{config_id}")
def delete_config(config_id: int, db: Session = Depends(get_db)):
    config = db.get(LLMConfig, config_id)
    if not config:
        raise HTTPException(status_code=404, detail="配置不存在")
    db.delete(config)
    db.commit()
    return {"message": "配置已删除"}
