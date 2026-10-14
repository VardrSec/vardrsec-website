// Generated from the reviewed Python public vocabulary; do not edit manually.
const policy = {"version":1,"commands":["base64","bash","cd","chattr","chmod","chown","cp","crontab","curl","dash","echo","install","ln","ls","mkdir","mv","nohup","perl","printf","python","python3","rm","sed","service","sh","systemctl","tar","tee","tftp","touch","uname","unzip","wget"],"arguments":["+i","+ia","+x","-","--","--location","--no-check-certificate","--silent","-L","-O","-R","-S","-a","-c","-d","-e","-f","-fr","-fsS","-fsSL","-i","-ia","-l","-m","-n","-o","-p","-q","-r","-rf","-s","-sL","-sSL","-u","-v","-x","600","644","700","755","777","a+x","daemon-reload","disable","enable","go=","restart","start","stop","u+x","~"],"paths":[".bashrc",".ssh",".ssh/authorized_keys","/dev/null","/etc/cron.d","/etc/cron.d/[PATH]","/etc/cron.daily","/etc/cron.daily/[PATH]","/etc/crontab","/etc/rc.local","/etc/systemd/system","/etc/systemd/system/[PATH]","/root/.ssh/authorized_keys","/tmp","/var/tmp","[HOME]/.ssh/authorized_keys","authorized_keys","~/.bashrc","~/.profile","~/.ssh","~/.ssh/authorized_keys"],"markers":["[EXECUTABLE]","[PATH]","[SSH_KEY]","[TEXT]","[URL]","[VALUE]"],"separators":["&&",";","|","||"],"redirects":["<",">",">>"]};
const commands = new Set(policy.commands), args = new Set(policy.arguments);
const paths = new Set(policy.paths), markers = new Set(policy.markers);
const separators = new Set(policy.separators), redirects = new Set(policy.redirects);
const operators = new Set([...separators, ...redirects]);
const vocabulary = new Set([...commands, ...args, ...paths, ...markers, ...operators]);
function safeTemplate(value) {
  if (typeof value !== 'string' || value.length < 20 || value.length > 350) return false;
  const words = value.split(' ');
  if (words.some(w => !w || !vocabulary.has(w))) return false;
  const groups = []; let group = [];
  for (const word of words) {
    if (separators.has(word)) {
      if (!group.length) return false;
      groups.push(group); group = [];
    } else group.push(word);
  }
  if (!group.length) return false;
  groups.push(group);
  if (groups.length < 2 && !words.some(w => redirects.has(w))) return false;
  for (const g of groups) {
    if (!commands.has(g[0]) && g[0] !== '[EXECUTABLE]') return false;
    for (let i = 1; i < g.length; i++) {
      if (redirects.has(g[i])) {
        if (i + 1 === g.length || operators.has(g[i + 1])) return false;
      } else if (!args.has(g[i]) && !paths.has(g[i]) && !markers.has(g[i])) return false;
    }
  }
  const names = new Set(groups.map(g => g[0]));
  const has = (...values) => values.some(v => names.has(v));
  const keyPath = words.some(w => w.includes('authorized_keys') || w === '.ssh' || w === '~/.ssh');
  const persistencePath = words.some(w => w.startsWith('/etc/cron') || w.startsWith('/etc/systemd/system')
    || ['/etc/rc.local', '.bashrc', '~/.bashrc', '~/.profile'].includes(w));
  const cronWrite = groups.some(g => g[0] === 'crontab' && g.slice(1).some(w => !operators.has(w) && w !== '-l'));
  return (keyPath && has('rm','mkdir','chmod','chown','chattr','echo','tee','cp','mv'))
    || has('curl','wget','tftp') || cronWrite
    || (persistencePath && has('echo','tee','cp','mv','touch','install','ln','sed'))
    || has('chmod','chown','chattr','systemctl','service','install');
}
const policyVersion = policy.version;
export { safeTemplate, policyVersion };
