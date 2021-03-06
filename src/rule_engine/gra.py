import copy
import fnmatch
from collections import OrderedDict

"""
GenAP Rule Applier, GRA

Applies data to rules, produces result
"""


class GRA:
    def parseNodeToSourceKeyedDict(self, node, parents=tuple()):
        ret = dict()
        for key, child in node.items():
            if isinstance(child, dict):
                # New level
                ret.update(self.parseNodeToSourceKeyedDict(child, parents + (key,)))
            else:
                # "AA": 0.102587
                # "AFR": 0.05
                # etc
                ret[parents + (key,)] = child
        return ret

    """
    Applies rules, returns (passed, notpassed) tuple
    """

    """
    Looks for a rule with a source like refassessment.*.ref_segregation. Go over the data and find matching sources. Create a new rule for each
    match and add to rules. Thereafter normal engine processing.
    """

    def expand_multi_rules(self, rules, dataflattened):
        for rule in rules[:]:
            if rule.source and ".*." in rule.source:
                newrules = list()
                for datasource in list(dataflattened.keys()):
                    if fnmatch.fnmatch(datasource, rule.source):
                        newrule = copy.deepcopy(rule)
                        newrule.source = datasource
                        newrules.append(newrule)
                # Reinsert the new rules, replacing the current rule at same location
                rule_idx = rules.index(rule)
                rules.pop(rule_idx)
                # Reverse list, since items will be inserted one by one at same position
                # This will keep original order
                newrules.reverse()
                for n in newrules:
                    rules.insert(rule_idx, n)

    def applyRules(self, rules, data):
        passed = list()
        notpassed = list()
        dataflattened = {".".join(list(k)): v for k, v in data.items()}
        rulelist = [rul for resultlist in list(rules.values()) for rul in resultlist]
        self.expand_multi_rules(rulelist, dataflattened)
        ret = (passed, notpassed)
        for rule in rulelist:
            if rule.aggregate:
                if rule.query([r.code for r in passed]):
                    passed.append(rule)
                else:
                    notpassed.append(rule)
            else:
                if rule.source in dataflattened:
                    if rule.query(dataflattened[rule.source]):
                        passed.append(rule)
                    else:
                        notpassed.append(rule)
                else:
                    notpassed.append(rule)
        return ret

    # {foo.bar:BP7, baz.gaz:PP4}
    def groupSources(self, sources):
        ret = OrderedDict()
        for key, rule in sources.items():
            subkeys = key.split(".")
            subdict = ret
            for subkey in subkeys[:-1]:
                subdict = subdict.setdefault(subkey, dict())
            subdict.setdefault(subkeys[-1], []).extend(rule)
        return ret
