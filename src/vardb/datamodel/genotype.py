"""vardb datamodel Genotype class"""
from sqlalchemy import Column, Sequence, Integer, Boolean
from sqlalchemy import ForeignKey
from sqlalchemy.orm import relationship

from vardb.datamodel import Base
from vardb.datamodel import allele, sample, assessment


class Genotype(Base):
    """Represent an observed diploid geneotype (i.e. an instance of a pair of alleles.)"""
    __tablename__ = "genotype"

    id = Column(Integer, Sequence("id_genotype_seq"), primary_key=True)
    allele_id = Column(Integer, ForeignKey("allele.id"), nullable=False)
    secondallele_id = Column(Integer, ForeignKey("allele.id"))
    allele = relationship("Allele", primaryjoin=("genotype.c.allele_id==allele.c.id"))
    secondallele = relationship("Allele", primaryjoin=("genotype.c.secondallele_id==allele.c.id")) # None, if not hetrozygous nonreference
    homozygous = Column(Boolean, nullable=False)
    sample_id = Column(Integer, ForeignKey("sample.id"), index=True, nullable=False)
    sample = relationship("Sample", backref='genotypes')
    genotypeQuality = Column("genotype_quality", Integer)
    sequencingDepth = Column("sequencing_depth", Integer)
    variantQuality = Column("variant_quality", Integer) # Assume integer, not floating point

    def __repr__(self):
        return "<Genotype('%s','%s', '%s', '%s')>" % (self.allele, self.secondallele, self.homozygous, self.sample)

