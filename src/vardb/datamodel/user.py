import datetime
import pytz
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import JSONB

from vardb.datamodel import Base
from vardb.util.mutjson import JSONMutableDict


class User(Base):
    """Represents a user."""
    __tablename__ = "user"

    id = Column(Integer, primary_key=True)
    username = Column(String(), nullable=False, unique=True)
    first_name = Column(String(), nullable=False)
    last_name = Column(String(), nullable=False)
    password = Column(String(), nullable=False)
    password_expiry = Column(DateTime(timezone=True), nullable=False)
    active = Column(Boolean, default=True, nullable=False)
    incorrect_logins = Column(Integer, default=0, nullable=False)


class UserSession(Base):
    """Represents a user session"""
    __tablename__ = "usersession"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("user.id"))
    user = relationship("User")
    token = Column(String(), nullable=False, unique=True)
    issued = Column(DateTime(timezone=True), default=lambda: datetime.datetime.now(pytz.utc), nullable=False)
    lastactivity = Column(DateTime(timezone=True), default=lambda: datetime.datetime.now(pytz.utc), nullable=False)
    expires = Column(DateTime(timezone=True), nullable=False)
    logged_out = Column(DateTime(timezone=True))


class UserOldPassword(Base):
    __tablename__ = "useroldpassword"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("user.id"))
    password = Column(String(), nullable=False)
    expired = Column(DateTime(timezone=True), default=lambda: datetime.datetime.now(pytz.utc), nullable=False)
