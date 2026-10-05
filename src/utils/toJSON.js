// Plugin: devolve "id" no lugar de "_id" e nunca expõe senhaHash
module.exports = function toJSONPlugin(schema) {
  schema.set('toJSON', {
    virtuals: true,
    versionKey: false,
    transform: (doc, ret) => {
      delete ret._id;
      delete ret.senhaHash;
      return ret;
    },
  });
};
