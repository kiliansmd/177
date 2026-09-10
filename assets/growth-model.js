export const PEOPLE={mum:{label:'deine Mum',greeting:'Jemand möchte mit dir gemeinsam in Bewegung kommen. Entdecke 17/7 und findet euren Einstieg zusammen.'},dad:{label:'deinen Dad',greeting:'Jemand möchte mit dir gemeinsam in Bewegung kommen. Entdecke 17/7 und findet euren Einstieg zusammen.'},friend:{label:'einen Freund',greeting:'Zusammen fällt der erste Schritt oft leichter. Du bist eingeladen, das Gym mit einem Menschen kennenzulernen, der dich kennt.'},family:{label:'deine Familie',greeting:'Ein gemeinsamer Anfang für euch. Schau dir das Gym an und sprecht darüber, wie euer erster Besuch aussehen kann.'}};
export function invitationFromUrl(value){
 const url=new URL(value);const person=url.searchParams.get('person'),ref=url.searchParams.get('ref');
 return Object.hasOwn(PEOPLE,person)&&/^[a-f0-9]{16}$/.test(ref||'')?{person,ref}:null;
}
export function invitationUrl(origin,person,ref){
 if(!Object.hasOwn(PEOPLE,person)||!/^[a-f0-9]{16}$/.test(ref||''))throw new Error('Invalid invitation');
 const base=new URL(origin);if(!['http:','https:'].includes(base.protocol))throw new Error('Invalid origin');
 const url=new URL('/gemeinsam-starten/',base.origin);url.searchParams.set('person',person);url.searchParams.set('ref',ref);url.hash='einladung-erhalten';return url.href;
}
export function invitationMessage(url){return 'Gemeinsam stärker. Ich würde 17/7 in Rheinbach gern mit dir kennenlernen. Schau dir meine Einladung an: '+url;}
export function corporateMessage(values){
 const company=String(values.company||'').trim().slice(0,120),email=String(values.email||'').trim().slice(0,150);
 const sizes=['Unter 5','5–10','11–25','26–50','Mehr als 50'],interests=['Firmenfitness','30-Tage-Challenge','Gesundheitsaktion','Unternehmenscode'];
 if(!company||!sizes.includes(values.size)||!interests.includes(values.interest)||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return null;
 const subject='Firmenfitness: '+company.replace(/[\r\n]/g,' ');
 const body=`Hallo 17/7-Team,\n\nwir interessieren uns für Firmenfitness in Rheinbach.\n\nUnternehmen: ${company}\nInteressierte Mitarbeitende: ${values.size}\nSchwerpunkt: ${values.interest}\nKontakt: ${email}\n\n${String(values.message||'').trim().slice(0,1500)}\n\nBitte meldet euch zur Abstimmung der Möglichkeiten und Konditionen.`;
 return {subject,body,preview:'An: info@performance-gym.de\nBetreff: '+subject+'\n\n'+body,href:'mailto:info@performance-gym.de?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(body)};
}
