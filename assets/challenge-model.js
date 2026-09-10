/* The challenge asks for preferences, never diagnoses or promises training results. */
export const QUESTIONS = [
  {id:'goal', tag:'Dein Ziel', title:'Was möchtest du bewegen?', note:'Wähle, was dir für die nächsten 30 Tage am wichtigsten ist.', options:[
    {id:'routine', label:'In Bewegung kommen', detail:'Training zu einer Gewohnheit machen.', short:'Mehr Routine'},
    {id:'strength', label:'Kraft aufbauen', detail:'Stärker werden und gezielt trainieren.', short:'Kraft'},
    {id:'endurance', label:'Ausdauer verbessern', detail:'Länger aktiv sein und fitter fühlen.', short:'Ausdauer'},
    {id:'balance', label:'Ausgleich finden', detail:'Mehr Bewegung in meinen Alltag bringen.', short:'Ausgleich'}
  ]},
  {id:'experience', tag:'Dein Ausgangspunkt', title:'Wo stehst du gerade?', note:'Die Challenge soll zu deinem bisherigen Training passen.', options:[
    {id:'beginner', label:'Ich fange an', detail:'Ich habe bisher wenig oder keine Trainingserfahrung.', short:'Einstieg'},
    {id:'returning', label:'Ich steige wieder ein', detail:'Ich habe Erfahrung, aber länger pausiert.', short:'Wiedereinstieg'},
    {id:'regular', label:'Ich trainiere regelmäßig', detail:'Training gehört bereits zu meinem Alltag.', short:'Regelmäßig'}
  ]},
  {id:'time', tag:'Dein Zeitbudget', title:'Wie viel Zeit passt zu dir?', note:'Denke an eine einzelne Trainingseinheit – so, wie dein Alltag wirklich ist.', options:[
    {id:'short', label:'10–15 Minuten', detail:'Kurz und gut in den Tag einzubauen.', short:'10–15 Min.', minutes:[10,15]},
    {id:'medium', label:'20–30 Minuten', detail:'Ein bewusstes Zeitfenster für mich.', short:'20–30 Min.', minutes:[20,30]},
    {id:'long', label:'40–45 Minuten', detail:'Ich möchte mir mehr Zeit nehmen.', short:'40–45 Min.', minutes:[40,45]}
  ]},
  {id:'frequency', tag:'Dein Rhythmus', title:'Wie oft möchtest du aktiv sein?', note:'Wähle die Anzahl deiner Trainingseinheiten pro Woche. Es geht um deinen Wunsch-Rhythmus.', options:[
    {id:'two', label:'2 × pro Woche', detail:'Ein überschaubarer Einstieg in die Woche.', short:'2 × / Woche', count:2},
    {id:'three', label:'3 × pro Woche', detail:'Regelmäßige feste Momente für mein Training.', short:'3 × / Woche', count:3},
    {id:'four', label:'4 × pro Woche', detail:'Bewegung darf öfter auf meinem Plan stehen.', short:'4 × / Woche', count:4}
  ]}
];

const FOLLOWUPS = {
  entry:{id:'entry', tag:'Dein Einstieg', title:'Was erleichtert dir den Anfang?', note:'Zum Einstieg zählt, was dir persönlich hilft, ins Tun zu kommen.', options:[
    {id:'small_steps',label:'Kleine, klare Schritte',detail:'Ein überschaubarer Anfang.',short:'Kleine Schritte'},
    {id:'fixed_rhythm',label:'Ein fester Rhythmus',detail:'Training bekommt einen Platz im Alltag.',short:'Fester Rhythmus'},
    {id:'variety',label:'Mehr Abwechslung',detail:'Bewegung soll interessant bleiben.',short:'Abwechslung'}
  ]},
  restart:{id:'restart',tag:'Dein Wiedereinstieg',title:'Was ist dir beim Neustart wichtig?',note:'Du bringst Erfahrung mit. Gib deinem Wiedereinstieg einen klaren Schwerpunkt.',options:[
    {id:'stepwise',label:'Schrittweise wieder anfangen',detail:'Ankommen, ohne alles auf einmal zu wollen.',short:'Schrittweise starten'},
    {id:'consistency',label:'Wieder regelmäßig trainieren',detail:'Meine Routine zurückgewinnen.',short:'Regelmäßigkeit'},
    {id:'fresh_start',label:'Mein Training neu sortieren',detail:'Mit einer neuen Ausrichtung beginnen.',short:'Neue Ausrichtung'}
  ]},
  strength:{id:'strength_focus',tag:'Dein Kraft-Fokus',title:'Wie trainierst du am liebsten?',note:'Du trainierst bereits regelmäßig und möchtest stärker werden. Was liegt dir?',options:[
    {id:'weights',label:'Mit freien Gewichten',detail:'Hanteln und freie Bewegungen.',short:'Freie Gewichte'},
    {id:'machines',label:'An Kraftgeräten',detail:'Geführte Bewegungen an Geräten.',short:'Kraftgeräte'},
    {id:'strength_mix',label:'Mit einer Mischung',detail:'Ich kombiniere beides gerne.',short:'Geräte & Gewichte'}
  ]},
  endurance:{id:'endurance_focus',tag:'Dein Ausdauer-Fokus',title:'Welche Bewegung liegt dir?',note:'Dein Ausdauerziel steht fest. Diese Auswahl gibt deinem Profil mehr Richtung.',options:[
    {id:'cardio',label:'Cardiotraining im Gym',detail:'Zum Beispiel Laufband, Ergometer oder Crosstrainer.',short:'Cardio im Gym'},
    {id:'outside',label:'Bewegung draußen',detail:'Ich bin gerne an der frischen Luft aktiv.',short:'Draußen'},
    {id:'endurance_mix',label:'Eine Kombination',detail:'Drinnen und draußen passen zu mir.',short:'Drinnen & draußen'}
  ]},
  setting:{id:'setting',tag:'Dein Alltag',title:'Wo passt Bewegung am besten hinein?',note:'Dein Ziel und dein Zeitbudget stehen. Jetzt fehlt noch der Rahmen.',options:[
    {id:'gym',label:'Im Fitnessstudio',detail:'Ich nehme mir bewusst Zeit im Gym.',short:'Im Gym'},
    {id:'home',label:'Zuhause oder draußen',detail:'Ich möchte in meiner Nähe aktiv sein.',short:'Zuhause / draußen'},
    {id:'flexible',label:'Flexibel kombinieren',detail:'Je nachdem, wie mein Tag aussieht.',short:'Flexibel'}
  ]}
};

export function followup(answers) {
  if (answers.experience==='beginner') return FOLLOWUPS.entry;
  if (answers.experience==='returning') return FOLLOWUPS.restart;
  return FOLLOWUPS[answers.goal] || FOLLOWUPS.setting;
}
export function selected(question,value) { return question.options.find(option=>option.id===value); }
export function normalizeAnswers(raw={}) {
  if(!raw||typeof raw!=='object')raw={};
  const answers={};
  for(const question of QUESTIONS) if(selected(question,raw[question.id])) answers[question.id]=raw[question.id];
  const last=followup(answers);
  if(raw.focusQuestion===last.id && selected(last,raw.focus)) { answers.focusQuestion=last.id; answers.focus=raw.focus; }
  return answers;
}
export function allQuestions(answers) { return [...QUESTIONS,{...followup(answers),key:'focus'}]; }
export function isComplete(answers) {
  const valid=normalizeAnswers(answers);
  return QUESTIONS.every(q=>!!valid[q.id]) && !!valid.focus;
}
export function profile(answers) {
  if(!isComplete(answers)) return null;
  const [goal,experience,time,frequency]=QUESTIONS.map(q=>selected(q,answers[q.id]));
  const extra=selected(followup(answers),answers.focus);
  const title=experience.id==='beginner'?'Dein Anfang. In deinem Tempo.':experience.id==='returning'?'Dein Wiedereinstieg. Mit Richtung.':goal.id==='strength'?'Deine Kraft. Dein Fokus.':goal.id==='endurance'?'Deine Ausdauer. Dein Rhythmus.':'Dein Alltag. Mehr Bewegung.';
  return {goal,experience,time,frequency,extra,title,
    weeklyMinutes:time.minutes.map(n=>n*frequency.count),
    rows:[['Ziel',goal.label],['Erfahrung',experience.label],['Zeit pro Einheit',time.label],['Training pro Woche',frequency.label],[followup(answers).tag,extra.label]]};
}
export function normalizePhone(value) {
  if(typeof value!=='string')return '';
  const phone=value.trim().replace(/^\+|[\s()-]/g,'');
  return /^[1-9]\d{7,14}$/.test(phone)?phone:'';
}
export function startMessage(answers,keyword='30TAGE') {
  const p=profile(answers);if(!p)return '';
  const key=/^[A-Z0-9_-]{1,24}$/.test(keyword)?keyword:'30TAGE';
  return `${key} – ich möchte starten.\nZiel: ${p.goal.short}\nErfahrung: ${p.experience.short}\nZeit: ${p.time.short}\nTraining: ${p.frequency.short}\nFokus: ${p.extra.short}`;
}
export function whatsappUrl(answers,config={}) {
  const phone=normalizePhone(config.whatsapp_number);const message=startMessage(answers,config.message_keyword);
  return phone&&message?'https://wa.me/'+phone+'?text='+encodeURIComponent(message):'';
}
