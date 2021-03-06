# User interface

::: warning NOTE
This documentation is a work in progress and is not currently up to date.

Please contact developers for more details.
:::

[[toc]]

## Pages / views

The views and corresponding routes are defined in `router.js`:

- Overview of analysis and samples
- Analysis interpretation
- Variant interpretation
- Login

## Overview

There are two overview pages, one for analysis and one for alleles/variants. The categorization is mostly done in the backend.

**Code**

- `api/v1/resources/overview.py`
- `webui/src/js/views/overviews/analysisSelection.directive.js`
- `webui/src/js/views/overviews/alleleSelection.directive.js`
- `webui/src/js/widgets/analysisList.directive.js`
- `webui/src/js/widgets/alleleList.directive.js`

## Analysis interpretation

Multiple alleles; details of the first is shown.

Apart from the **allele sidebar**, the rest of the page is very similar to allele interpretation.

Variants that are excluded can be manually included.

If there has been multiple interpretation rounds, each can be opened. The ones with status "Done" can only be imported read-only.

### Details on loading data
The route `/analysis/:analysisId` is rendered (mainly) by directives `workflowAnalysis.directive.js` and `interpretation.directive.js`, which:

- Load interpretations rounds
- Select a round (usually the latest)
- Load that round's alleles, ACMG criteria and references.

![](./img/load_analysis.png)

The directives chooses the last interpretation round as the "selected" one.
If this round is "Done" we make a copy of it (to make sure  we don't accidentally change it) and uses the copy as "selected".

A flag is set on the copy to indicate that we want the latest entities to be loaded for this allele (like annotations, assessments).

This allows us to choose a static interpretation page using the entities found in the snapshots or a "dynamic" interpretation using the latest entities (annotations, assessments etc). Both have the same state, showing the same classification, comments etc.

**Code related to static/dynamic interpretations pages**

- `WorkflowAlleleController.reloadInterpretationData`
- `WorkflowAnalysisController.reloadInterpretationData`


**Code**

- `api.util.interpretationdataloader.InterpretationDataLoader`
- `api.v1.resources.workflow.analysis.AnalysisInterpretationAllelesListResource`
- `api.v1.resources.workflow.analysis.AnalysisInterpretationResource`
- `api.util.allelefilter.AlleleFilter`
- `api/schemas`
- `webui/src/js/views/workflow/workflowAnalysis.directive.js`
- `webui/src/js/views/workflow/interpretation.directive.js`
- `webui/src/js/views/alleleSidebar.directive.js`

## Allele interpretation

Only a single allele is displayed. The various interpretation rounds are not accessible in the UI.

Loading a single allele similar but simpler:

- Load allele data (variant, annotation): `/alleles/?q=[genepanel, chr, position, ..]`
- Load gene panel (phenotypes, transcript, config): `/genepanels/NAME/VERSION/`
- Find ACMG criteria: `/acmg/alleles/` (POST)
- Load interpretation rounds: `/workflows/alleles/576/interpretations/`
- Find references

Note that interpretation rounds are not needed to load allele data.

**Code**

- `api/schemas`
- `webui/src/js/views/workflow/workflowAllele.directive.js`
- `webui/src/js/views/workflow/interpretation.directive.js`
