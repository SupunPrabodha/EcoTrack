function randString(n) {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let s = "";
  for (let i = 0; i < n; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

module.exports = {
  generateUser: function generateUser(userContext, events, done) {
    const id = randString(10);
    userContext.vars.name = "Perf User";
    userContext.vars.email = `perf_${id}@ecotrack.local`;
    userContext.vars.password = "PerfPass123!";
    return done();
  },
};
