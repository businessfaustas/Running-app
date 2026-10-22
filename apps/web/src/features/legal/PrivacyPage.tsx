import { Link } from 'react-router'
import { MIN_AGE, OPERATOR } from '../../content/legal'
import { LegalLayout } from './LegalLayout'

export function PrivacyPage() {
  return (
    <LegalLayout title="Privatumo politika">
      <p>
        Ši politika paaiškina, kokius asmens duomenis tvarko PaceMates, kodėl tai darome ir
        kokias teises turi. Duomenis tvarkome pagal Bendrąjį duomenų apsaugos reglamentą (BDAR) ir
        Lietuvos Respublikos asmens duomenų teisinės apsaugos įstatymą.
      </p>

      <h2>1. Kas tvarko duomenis</h2>
      <p>
        Duomenų valdytojas – <strong>{OPERATOR.name}</strong> (toliau – „mes“). Visais privatumo
        klausimais rašyk <strong>{OPERATOR.email}</strong>.
      </p>

      <h2>2. Kokius duomenis renkame</h2>
      <ul>
        <li>
          <strong>Paskyros duomenys:</strong> vardas, el. pašto adresas, slaptažodis (saugomas tik
          kaip kriptografinė maiša – mes jo nematome) ir laikas, kada sutikai su sąlygomis.
        </li>
        <li>
          <strong>Profilio duomenys, kuriuos pateiki:</strong> aprašymas, sporto šakos,
          įprasti tempai, miestas, kuriame dažniausiai sportuoji, Strava ID ir profilio
          nuotrauka, jei ją įkeli. Prieš įkeliant nuotrauka apkerpama ir perkoduojama tavo
          įrenginyje, todėl jos metaduomenys (pvz., fotografavimo vieta) pas mus nepatenka.
        </li>
        <li>
          <strong>Veiklos duomenys:</strong> tavo skelbiamos treniruotės (laikas, susitikimo vieta,
          atstumas, tempas, aprašymas), dalyvavimas treniruotėse, žinutės grupių pokalbiuose,
          varžybos, į kurias žadi vykti (ir pasirinkta distancija), bei įrašai ir atsakymai
          varžybų forumuose.
        </li>
        <li>
          <strong>Vieta:</strong> tik tada, kai kuriant treniruotę paspaudi „Mano vieta“ arba
          renkantis miestą – „Pagal mano vietą“. Ji naudojama vien tam, kad pažymėtume tašką
          žemėlapyje ar rastume artimiausią miestą; tavo buvimo vietos istorijos nesaugome.
        </li>
        <li>
          <strong>Mitybos skaičiuoklė:</strong> joje įvesti duomenys (svoris, amžius, lytis,
          pulsas) lieka tik tavo naršyklėje – skaičiuojama tavo įrenginyje, mums jie nesiunčiami.
        </li>
        <li>
          <strong>Techniniai duomenys:</strong> IP adresas ir naršyklės informacija, reikalingi
          saugumui (pvz., bandymų skaičiui riboti), anoniminė lankomumo statistika ir klaidų
          ataskaitos.
        </li>
      </ul>

      <h2>3. Kam naudojame ir kokiu pagrindu</h2>
      <ul>
        <li>
          Paskyrai, treniruotėms, dalyvavimui ir pokalbiams užtikrinti – <strong>sutarties
          vykdymas</strong> (BDAR 6 str. 1 d. b p.).
        </li>
        <li>
          Paslaugos el. laiškams (paskyros patvirtinimas, slaptažodžio atkūrimas) – sutarties
          vykdymas. Rinkodaros laiškų nesiunčiame.
        </li>
        <li>
          Saugumui, piktnaudžiavimo prevencijai ir klaidoms taisyti – <strong>teisėtas
          interesas</strong> (BDAR 6 str. 1 d. f p.).
        </li>
        <li>
          Anoniminei statistikai, padedančiai tobulinti programėlę, – teisėtas interesas.
          Statistika renkama be slapukų ir tavęs neidentifikuoja.
        </li>
      </ul>

      <h2>4. Ką mato kiti</h2>
      <p>
        Tavo vardas, nuotrauka, miestas, aprašymas, sporto šakos, tempai, treniruotės, kurias
        organizuoji ar kuriose dalyvauji, varžybos, į kurias žadi vykti (su distancija), ir
        įrašai varžybų forumuose yra <strong>vieši</strong> – juos gali matyti ir neprisijungę
        lankytojai, nes tik taip galima rasti grupę ar bendraminčius. Grupės pokalbį mato tik
        tos treniruotės dalyviai. Tavo el. pašto adreso kitiems naudotojams nerodome.
      </p>
      <p>
        <strong>Lyderių lentelės</strong> viešai rodo, kiek kilometrų nubėgai ar numynei, kiek
        treniruočių įvyko ir kiek jų organizavai per savaitę ar mėnesį. Skaičiuojamos tik
        įvykusios PaceMates grupinės treniruotės, kuriose dalyvavai, – kitų tavo treniruočių
        nematome.
      </p>

      <h2>5. Kam perduodame duomenis</h2>
      <p>Duomenis tvarko tik mūsų paslaugų teikėjai, pagal sutartis su mumis:</p>
      <ul>
        <li>Supabase Inc. – duomenų bazė, prisijungimas ir profilio nuotraukų saugykla;</li>
        <li>Vercel Inc. – svetainės talpinimas ir anoniminė statistika;</li>
        <li>Functional Software Inc. (Sentry) – klaidų ataskaitos, jei jos įjungtos;</li>
        <li>OpenFreeMap – žemėlapio vaizdai (įkeliant žemėlapį jiems matomas tavo IP adresas).</li>
      </ul>
      <p>
        Kai kurie teikėjai duomenis gali tvarkyti už ES / EEE ribų. Tokiais atvejais taikomos
        Europos Komisijos patvirtintos standartinės sutarčių sąlygos arba ES ir JAV duomenų
        apsaugos sistema. Duomenų neparduodame ir reklamai neperduodame.
      </p>

      <h2>6. Kiek laiko saugome</h2>
      <p>
        Duomenis saugome, kol turi paskyrą. Ištrynus paskyrą, ji ir susiję duomenys (profilio
        nuotrauka, treniruotės, žinutės, forumo įrašai) pašalinami iš karto, o iš atsarginių
        kopijų – ne vėliau kaip per 30 dienų. Klaidų ataskaitos ir saugumo
        žurnalai saugomi iki 90 dienų.
      </p>

      <h2>7. Slapukai ir naršyklės saugykla</h2>
      <p>
        Reklaminių ar sekimo slapukų nenaudojame. Naršyklės vietinėje saugykloje laikome
        prisijungimo sesiją ir kelis nustatymus (pvz., ar jau matei įžangą, pasirinktą miestą,
        mitybos skaičiuoklės duomenis ir pasiruošimo varžyboms sąrašo žymes). Be jų programėlė
        neveiktų, todėl sutikimo jiems nereikia.
      </p>

      <h2>8. Tavo teisės</h2>
      <ul>
        <li>susipažinti su savo duomenimis ir gauti jų kopiją;</li>
        <li>ištaisyti duomenis – tai gali padaryti profilyje;</li>
        <li>
          ištrinti duomenis – <Link to="/settings">Nustatymai → Ištrinti paskyrą</Link>;
        </li>
        <li>apriboti tvarkymą arba nesutikti su tvarkymu teisėto intereso pagrindu;</li>
        <li>gauti duomenis perkeliamu formatu.</li>
      </ul>
      <p>
        Prašymus siųsk el. paštu {OPERATOR.email} – atsakysime per 30 dienų. Jei manai, kad tavo
        teisės pažeistos, gali kreiptis į Valstybinę duomenų apsaugos inspekciją (L. Sapiegos g.
        17, Vilnius, <a href="https://vdai.lrv.lt" target="_blank" rel="noreferrer">vdai.lrv.lt</a>
        ).
      </p>

      <h2>9. Amžius</h2>
      <p>PaceMates skirta asmenims nuo {MIN_AGE} metų.</p>

      <h2>10. Kaip saugome</h2>
      <p>
        Visas ryšys šifruojamas (HTTPS), slaptažodžiai saugomi tik maišos pavidalu, prieigą prie
        duomenų bazėje kiekvienai eilutei riboja saugumo taisyklės, o veiksmų skaičius ribojamas,
        kad būtų sunkiau piktnaudžiauti. Atsarginės duomenų bazės kopijos šifruojamos.
      </p>

      <h2>11. Pakeitimai</h2>
      <p>
        Apie esminius šios politikos pakeitimus pranešime programėlėje arba el. paštu.
      </p>
    </LegalLayout>
  )
}
