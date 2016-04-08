import re

"""
GenAP Rule Classifier, GRC

Creates the final ACMG classification based on result from the GRE rule engine.
Uses regexp programs to represent code patterns.
"""
class ACMGClassifier2015:

    # Regexp patterns
    PVS = re.compile("PVS.*")
    PS = re.compile("PS.*")
    PM = re.compile("PM.*")
    PP = re.compile("PP.*")
    BA = re.compile("BA.*")
    BS = re.compile("BS.*")
    BP = re.compile("BP.*")

    """
    Call with a list of passed codes to get the correct ClassificationResult.
    """
    def classify(self, passed_codes):
        pathogenic = self.pathogenic(passed_codes)
        likely_pathogenic = self.likely_pathogenic(passed_codes)
        benign = self.benign(passed_codes)
        likely_benign = self.likely_benign(passed_codes)
        (cont_rules, cont_message) = self.contradict(pathogenic, likely_pathogenic, benign, likely_benign)
        if cont_rules:
            return ClassificationResult(3, "Uncertain significance", cont_rules, cont_message)
        if pathogenic:
            return ClassificationResult(5, "Pathogenic", pathogenic, "Pathogenic")
        if benign:
            return ClassificationResult(1, "Benign", benign, "Benign")
        if likely_pathogenic:
            return ClassificationResult(4, "Likely pathogenic", likely_pathogenic, "Likely pathogenic")
        if likely_benign:
            return ClassificationResult(2, "Likely benign", likely_benign, "Likely benign")
        return ClassificationResult(3, "Uncertain significance", [], "None")

    """
    If the codes given satisfy the requirements for pathogenic, return list of all codes contributing, otherwise
    empty list.
    """
    def pathogenic(self, codes):
        return (
        self._OR(
            self.contrib(self.PVS, codes, lambda n : n >= 2),
            self._AND(
                      self.contrib(self.PVS, codes, lambda n : n == 1),
                      (self._OR(
                                self.contrib(self.PS, codes, lambda n : n >= 1),
                                self.contrib(self.PM, codes, lambda n : n >= 2),
                                self._AND(
                                          self.contrib(self.PM, codes, lambda n : n == 1),
                                          self.contrib(self.PP, codes, lambda n : n == 1)
                                          ),
                                self.contrib(self.PP, codes, lambda n : n >= 2)
                                )
                       )
                      ),
            self.contrib(self.PS, codes, lambda n : n >= 2),
            self._AND(
                      self.contrib(self.PS, codes, lambda n : n == 1),
                      self._OR(
                               self.contrib(self.PM, codes, lambda n : n >= 3),
                               self._AND(
                                         self.contrib(self.PM, codes, lambda n : n == 2),
                                         self.contrib(self.PP, codes, lambda n : n >= 2)
                                         ),
                               self._AND(
                                         self.contrib(self.PM, codes, lambda n : n == 1),
                                         self.contrib(self.PP, codes, lambda n : n >= 4)
                                         )
                               )
                      )
                )
        )

    """
    If the codes given satisfy the requirements for likely pathogenic, return list of all codes contributing, otherwise
    empty list.
    """
    def likely_pathogenic(self, codes):
        return  (
        self._OR(
            self._AND(
                      self.contrib(self.PVS, codes, lambda n : n == 1),
                      self.contrib(self.PM, codes, lambda n : n == 1)
                      ),
            self._AND(
                      self.contrib(self.PS, codes, lambda n : n == 1),
                      self.contrib(self.PM, codes, lambda n : n == 1)
                      ),
            self._AND(
                      self.contrib(self.PS, codes, lambda n : n == 1),
                      self.contrib(self.PP, codes, lambda n : n >= 2)
                      ),
            self.contrib(self.PM, codes, lambda n : n >= 3),
            self._AND(
                      self.contrib(self.PM, codes, lambda n : n == 2),
                      self.contrib(self.PP, codes, lambda n : n >= 2)
                      ),
            self._AND(
                      self.contrib(self.PM, codes, lambda n : n == 1),
                      self.contrib(self.PP, codes, lambda n : n >= 4)
                      )
                )
        )

    """
    If the codes given satisfy the requirements for benign, return list of all codes contributing, otherwise
    empty list.
    """
    def benign(self, codes):
        return  (
        self._OR(
                 self.contrib(self.BA, codes, lambda n : n >= 1),
                 self.contrib(self.BS, codes, lambda n : n >= 2)
                 )
        )

    """
    If the codes given satisfy the requirements for likely benign, return list of all codes contributing, otherwise
    empty list.
    """
    def likely_benign(self, codes):
        return  (
        self._OR(
                 self._AND(
                           self.contrib(self.BS, codes, lambda n : n == 1),
                           self.contrib(self.BP, codes, lambda n : n == 1)
                           ),
                 self.contrib(self.BP, codes, lambda n : n >= 2)
                 )
        )

    """
    List-or which returns a list containing elems of all contributing lists.
    Will contain duplicates if codes may contribute to the classification in different ways.
    """
    def _OR(self, *lists):
        ret = []
        for lst in lists:
            if lst: ret.extend(lst)
        return ret

    """
    List-and which returns a list containing elems of all contributing lists.
    Will contain duplicates if codes may contribute to the classification in different ways.
    """
    def _AND(self, *lists):
        ret = []
        for lst in lists:
            if lst: ret.extend(lst)
            else: return []
        return ret

    """
    If the number of occurences of the given pattern in codes passes the given constraint, return the occurences list.
    """
    def contrib(self, pattern, codes, length_constraint):
        occ = self.occurences(pattern, codes)
        if length_constraint(len(occ)):
            return occ
        return []

    """
    The occurences matching the given pattern in the codes list.
    Takes into account special counting codes for PP3 and BP4.
    """
    def occurences(self, pattern, codes):
        occ = []
        # These to be counted only once each:
        n_PP3 = 0
        n_BP4 = 0
        n_BS1 = 0
        for code in codes:
            if pattern.match(code):
                if code == "PP3":
                    if not n_PP3:
                        occ.append(code)
                        n_PP3 += 1
                elif code == "BP4":
                    if not n_BP4:
                        occ.append(code)
                        n_BP4 += 1
                elif code == "BS1":
                    if not n_BS1:
                        occ.append(code)
                        n_BS1 += 1
                else:
                    occ.append(code)
        return occ

    """
    If criteria are in contradiction:
      Return tuple (contributing codes,message)
    Else
      (None, None)
    """
    def contradict(self, pathogenic, likely_pathogenic, benign, likely_benign):
        if (pathogenic or likely_pathogenic) and (benign or likely_benign):
            return (pathogenic + likely_pathogenic + benign + likely_benign, "Contradiction")
        return (None, None)


"""
Result of ACMG classification. Aggregate of classification and metadata.
"""
class ClassificationResult:

    def __init__(self, clazz, classification, contributors, message):
        self.clazz = clazz
        self.classification = classification
        self.contributors = contributors
        self.message = message
        self.meta = dict()

    def __eq__(self, other):
            return (isinstance(other, self.__class__)
            and self.__dict__ == other.__dict__)
