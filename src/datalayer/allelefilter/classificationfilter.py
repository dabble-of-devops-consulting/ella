from typing import Any, Dict, List, Optional, Set, Tuple
from sqlalchemy.orm.session import Session
from vardb.datamodel import assessment


class ClassificationFilter(object):
    def __init__(self, session: Session, config: Optional[Dict[str, Any]]) -> None:
        self.session = session
        self.config = config

    def filter_alleles(
        self, gp_allele_ids: Dict[Tuple[str, str], List[int]], filter_config: Dict[str, List[str]]
    ) -> Dict[Tuple[str, str], Set[int]]:
        """
        Return the allele ids, among the provided allele_ids,
        that have have an existing classification in the provided filter_config['classes'].
        This filter does *not* check for outdated classification,
        these are treated as valid classifications
        """
        filter_classes = filter_config["classes"]
        available_classes = list(
            assessment.AlleleAssessment.classification.property.columns[0].type.enums
        )

        assert not set(filter_classes) - set(
            available_classes
        ), "Invalid class(es) to filter on in {}. Available classes are {}.".format(
            filter_classes, available_classes
        )

        result: Dict[Tuple[str, str], Set[int]] = dict()
        for gp_key, allele_ids in gp_allele_ids.items():
            if not allele_ids or not filter_classes:
                result[gp_key] = set()
                continue

            filtered_allele_ids = self.session.query(assessment.AlleleAssessment.allele_id).filter(
                assessment.AlleleAssessment.allele_id.in_(allele_ids),
                assessment.AlleleAssessment.classification.in_(filter_classes),
                assessment.AlleleAssessment.date_superceeded.is_(None),
            )

            result[gp_key] = set([a[0] for a in filtered_allele_ids])

        return result