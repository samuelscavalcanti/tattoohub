const regenerar = (req) =>
  new Promise((ok, fail) => req.session.regenerate((e) => (e ? fail(e) : ok())));
const destruir = (req) =>
  new Promise((ok, fail) => req.session.destroy((e) => (e ? fail(e) : ok())));
module.exports = { regenerar, destruir };
