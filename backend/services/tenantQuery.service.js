function withTenant(model, organizationId) {
    if (!organizationId) {
        throw new Error("organizationId is required for tenant-scoped query");
    }

    return {
        find(filter = {}) {
            return model.find({ ...filter, organizationId });
        },
        findOne(filter = {}) {
            return model.findOne({ ...filter, organizationId });
        },
        create(doc) {
            return model.create({ ...doc, organizationId });
        },
        updateOne(filter, update, options = {}) {
            return model.updateOne({ ...filter, organizationId }, update, options);
        },
        deleteOne(filter) {
            return model.deleteOne({ ...filter, organizationId });
        }
    };
}

module.exports = { withTenant };

