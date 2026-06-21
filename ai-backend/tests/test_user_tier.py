"""Tests for core/user_tier.py."""
import os
import pytest

# Patch env before importing module so Config singleton isn't stale
os.environ.setdefault("OWNER_EMAIL", "rautanurag9@gmail.com")


def test_owner_email_returns_owner_tier():
    from core.user_tier import UserTier, get_tier_config
    cfg = get_tier_config("rautanurag9@gmail.com")
    assert cfg.tier == UserTier.OWNER


def test_other_email_returns_free_tier():
    from core.user_tier import UserTier, get_tier_config
    cfg = get_tier_config("someone@example.com")
    assert cfg.tier == UserTier.FREE


def test_none_email_returns_free_tier():
    from core.user_tier import UserTier, get_tier_config
    cfg = get_tier_config(None)
    assert cfg.tier == UserTier.FREE


def test_email_matching_is_case_insensitive():
    from core.user_tier import UserTier, get_tier_config
    cfg = get_tier_config("RAUTANURAG9@GMAIL.COM")
    assert cfg.tier == UserTier.OWNER


def test_owner_config_has_openai_provider():
    from core.user_tier import UserTier, get_tier_config
    cfg = get_tier_config("rautanurag9@gmail.com")
    assert cfg.llm_provider == "openai"
    assert "gpt" in cfg.llm_model


def test_free_config_has_groq_provider():
    from core.user_tier import UserTier, get_tier_config
    cfg = get_tier_config("free@example.com")
    assert cfg.llm_provider == "groq"
    assert "llama" in cfg.llm_model


def test_owner_config_has_openai_embeddings():
    from core.user_tier import get_tier_config
    cfg = get_tier_config("rautanurag9@gmail.com")
    assert cfg.embedding_provider == "openai"


def test_free_config_has_huggingface_embeddings():
    from core.user_tier import get_tier_config
    cfg = get_tier_config("free@example.com")
    assert cfg.embedding_provider == "huggingface"
    assert cfg.embedding_model == "all-MiniLM-L6-v2"


def test_is_owner_property():
    from core.user_tier import get_tier_config
    assert get_tier_config("rautanurag9@gmail.com").is_owner is True
    assert get_tier_config("other@example.com").is_owner is False
