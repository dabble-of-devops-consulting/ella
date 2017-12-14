from marshmallow import fields, Schema


class GenotypeSchema(Schema):
    class Meta:
        fields = ('id',
                  'multiallelic',
                  'genotype_quality',
                  'sequencing_depth',
                  'variant_quality',
                  'allele_depth',
                  'filter_status',
                  'homozygous',
                  'genotype',
                  )

    genotype = fields.Method("get_genotype")
    multiallelic = fields.Method("is_multiallelic")

    def is_multiallelic(self, obj):
        return obj.secondallele_id is not None

    def get_genotype(self, obj):

        if obj.secondallele:
            v1 = obj.allele.change_to or '-'
            v2 = obj.secondallele.change_to or '-'
        elif obj.homozygous:
            v1 = obj.allele.change_to or '-'
            v2 = obj.allele.change_to or '-'
        else:
            v1 = obj.allele.change_from or '-'
            v2 = obj.allele.change_to or '-'
        return '{}/{}'.format(v1, v2)

