import { usePageMeta } from '../../lib/usePageMeta'
import { Link } from 'react-router'
import { formatPrice, PRICES, TRIAL_DAYS } from '@pacemates/shared'
import { MIN_AGE, OPERATOR } from '../../content/legal'
import { LegalLayout } from './LegalLayout'

export function TermsPage() {
  usePageMeta({ title: 'Naudojimo sąlygos' })
  return (
    <LegalLayout title="Naudojimosi sąlygos">
      <p>
        Šios sąlygos taikomos PaceMates programėlei ir svetainei (toliau – „paslauga“), kurią teikia{' '}
        {OPERATOR.name}. Registruojantis ar kitaip naudojantis paslauga, sutinki su šiomis sąlygomis
        ir <Link to="/privatumas">Privatumo politika</Link>.
      </p>

      <h2>1. Kas yra PaceMates</h2>
      <p>
        PaceMates padeda bėgikams ir dviratininkams rasti, su kuo kartu sportuoti. Treniruotes
        skelbia patys naudotojai.{' '}
        <strong>PaceMates treniruočių neorganizuoja, nevykdo ir nekontroliuoja</strong> – esame
        platforma, per kurią žmonės susitaria.
      </p>

      <h2>2. Paskyra</h2>
      <ul>
        <li>Registruotis gali asmenys nuo {MIN_AGE} metų.</li>
        <li>Nurodyk teisingą vardą ir el. paštą; vienas žmogus – viena paskyra.</li>
        <li>Saugok slaptažodį ir niekam jo neatskleisk. Už veiksmus savo paskyroje atsakai tu.</li>
      </ul>

      <h2>3. Elgesio taisyklės</h2>
      <p>Naudojantis paslauga draudžiama:</p>
      <ul>
        <li>skelbti melagingas ar klaidinančias treniruotes;</li>
        <li>siųsti šlamštą ar reklamą be mūsų sutikimo;</li>
        <li>įžeidinėti, grasinti, priekabiauti ar diskriminuoti kitus;</li>
        <li>skelbti kitų žmonių asmens duomenis be jų sutikimo;</li>
        <li>kelti nuotraukas, kurios nėra tavo ar kuriose be sutikimo matomi kiti žmonės;</li>
        <li>naudoti paslaugą neteisėtiems tikslams;</li>
        <li>
          bandyti apeiti saugumo priemones, trikdyti paslaugą ar automatiškai rinkti duomenis.
        </li>
      </ul>

      <h2>4. Sveikata ir saugumas</h2>
      <p>
        Fizinis aktyvumas susijęs su rizika. Treniruotėse dalyvauji <strong>savo atsakomybe</strong>
        :
      </p>
      <ul>
        <li>įvertink savo sveikatą ir pasirengimą; jei abejoji – pasitark su gydytoju;</li>
        <li>
          laikykis Kelių eismo taisyklių; dviračiu važiuok su šalmu, o tamsiu paros metu – su
          žibintais;
        </li>
        <li>susitik viešose vietose ir rinkis tempą pagal savo galimybes;</li>
        <li>pasiimk telefoną; skubiai pagalbai skambink bendruoju pagalbos numeriu 112;</li>
        <li>organizatoriai paprastai nėra profesionalūs treneriai, nebent nurodyta kitaip.</li>
      </ul>
      <p>
        <strong>Organizatoriai</strong>, skelbdami treniruotę, patvirtina, kad susitikimo vieta yra
        vieša (ne namų adresas), aprašymas, atstumas ir tempas teisingi, o pasikeitus planams
        treniruotę atšauks programėlėje. Organizatoriai nėra mūsų darbuotojai ar atstovai, ir mes jų
        netikriname.
      </p>
      <p>
        Kiek leidžia įstatymai, neatsakome už traumas, žalą ar nuostolius, patirtus treniruočių metu
        arba dėl kitų naudotojų veiksmų.
      </p>

      <h2>5. Tavo turinys</h2>
      <p>
        Tai, ką paskelbi (treniruotes, profilį, nuotraukas, žinutes, forumo įrašus), lieka tavo.
        Suteiki mums neišimtinę, nemokamą teisę šį turinį rodyti paslaugoje tiek, kiek reikia jai
        teikti. Turinį, pažeidžiantį šias sąlygas ar įstatymus, galime pašalinti. Ištrynus forumo
        temą ar paskyrą, kartu išnyksta ir kitų atsakymai į tavo temas.
      </p>
      <p>
        Klubą pridėti gali visi prisijungę naudotojai. Pridėjus klubą laikoma, kad patvirtini, jog
        informacija teisinga ir vieša. Klubą peržiūrime prieš rodydami kitiems ir galime jį
        pataisyti, atmesti ar vėliau pašalinti – pavyzdžiui, paprašius pačiam klubui.
      </p>

      <h2>6. Pranešimai apie netinkamą turinį ir autorių teises</h2>
      <p>
        Jei manai, kad įrašas, treniruotė, profilis ar nuotrauka yra neteisėti arba pažeidžia šias
        sąlygas (įskaitant <strong>autorių teises</strong>), spausk „Pranešti“ prie to turinio ir
        užpildyk formą arba rašyk <strong>{OPERATOR.email}</strong>. Pranešime nurodyk:
      </p>
      <ul>
        <li>nuorodą į turinį (ar kur jį rasti);</li>
        <li>kodėl jis, tavo manymu, neteisėtas ar pažeidžia sąlygas;</li>
        <li>savo vardą ir el. pašto adresą;</li>
        <li>patvirtinimą, kad informacija pateikta sąžiningai ir yra tiksli.</li>
      </ul>
      <p>
        Dėl autorių teisių pažeidimo pranešti gali teisių turėtojas arba jo atstovas – nurodyk, kurį
        kūrinį pažeidžia turinys. Pranešimus nagrinėja žmonės, ne automatinės sistemos; gavimą
        patvirtiname ir sprendimą priimame nedelsdami. Pašalinę ar apriboję turinį, turinio autoriui
        paaiškiname, kodėl, ir jis gali mums atsakyti bei paprašyti sprendimą peržiūrėti. Už
        pakartotinius pažeidimus paskyra gali būti sustabdyta.
      </p>
      <p>
        Vienas kontaktinis taškas naudotojams ir institucijoms (ES skaitmeninių paslaugų aktas):{' '}
        <strong>{OPERATOR.email}</strong>, lietuvių ir anglų kalbomis.
      </p>

      <h2>7. Paskyros sustabdymas ir ištrynimas</h2>
      <p>
        Pažeidus sąlygas, galime apriboti, sustabdyti ar ištrinti paskyrą. Tu gali bet kada ištrinti
        paskyrą skiltyje <Link to="/settings">Nustatymai</Link>.
      </p>

      <h2>8. Mokami planai (PaceMates Plus)</h2>
      <p>
        <strong>PaceMates naudoti nemokama</strong>: treniruočių paieška ir skelbimas, pokalbiai,
        varžybų kalendorius ir forumai, klubai, ženkliukai ir lyderių lentelės. Papildomos funkcijos
        – pasiruošimo planai varžyboms, pažangos statistika, kalendoriaus eksportas ir Plus
        ženklelis – yra mokamos.
      </p>
      <ul>
        <li>
          <strong>PaceMates Plus</strong> – prenumerata: {formatPrice(PRICES.plusMonthCents)} per
          mėnesį arba {formatPrice(PRICES.plusYearCents)} per metus.
        </li>
        <li>
          <strong>Varžybų leidimas</strong> – vienkartinis {formatPrice(PRICES.racePassCents)}{' '}
          pirkinys, atrakinantis visą pasiruošimo planą vienoms pasirinktoms varžyboms. Jis
          nesikartoja.
        </li>
        <li>
          Visos kainos nurodytos eurais ir <strong>įskaitant PVM</strong>. Kainas galime keisti;
          apie prenumeratos kainos pakeitimą pranešime iš anksto (ne vėliau kaip prieš 30 dienų), o
          jau apmokėtam laikotarpiui nauja kaina netaikoma.
        </li>
      </ul>
      <p>
        <strong>Bandomasis laikotarpis.</strong> Pirmą kartą užsisakius Plus, pirmosios {TRIAL_DAYS}{' '}
        dienų yra nemokamos. Pasibaigus laikotarpiui, jei prenumeratos neatšaukei, automatiškai
        nuskaitoma pasirinkto plano kaina, o prenumerata atnaujinama kas mėnesį arba kas metus, kol
        ją atšauksi. Prieš pasibaigiant bandomajam laikotarpiui išsiųsime priminimą.
      </p>
      <p>
        <strong>Atšaukimas.</strong> Prenumeratą gali atšaukti bet kada skiltyje{' '}
        <Link to="/settings">Nustatymai → Prenumerata</Link>. Atšaukus, prieiga lieka iki apmokėto
        laikotarpio pabaigos ir daugiau nieko nenuskaitoma. Ištrynus paskyrą prenumerata nutraukiama
        iš karto; už jau prasidėjusį apmokėtą laikotarpį pinigai negrąžinami, nebent privalomos
        teisės normos numato kitaip.
      </p>
      <p>
        <strong>Atsisakymo teisė.</strong> Kaip vartotojas turi teisę per 14 dienų nuo sutarties
        sudarymo atsisakyti jos nenurodydamas priežasties. Mokėdamas pažymi, kad nori, jog
        skaitmeninė paslauga ar turinys būtų suteikti nedelsiant, ir supranti, kad: (a)
        atsisakydamas Plus prenumeratos per 14 dienų sumokėsi tik už jau suteiktą paslaugą dalį; (b)
        kai Varžybų leidimu atrakintas pilnas planas jau pateiktas, atsisakymo teisė prarandama.
        Praktiškai mes linkę grąžinti pinigus visiems, kurie paprašo pirmosiomis dienomis – parašyk{' '}
        <a href={`mailto:${OPERATOR.email}`}>{OPERATOR.email}</a>.
      </p>
      <p>
        <strong>Mokėjimai.</strong> Apmokėjimą apdoroja Stripe Payments Europe, Ltd. Kortelės
        duomenų PaceMates nemato ir nesaugo. Plus galioja tavo paskyrai ir negali būti perduotas
        kitam žmogui.
      </p>
      <p>
        <strong>Planų pobūdis.</strong> Pasiruošimo planai ir statistika yra bendro pobūdžio
        informacija sveikiems suaugusiems žmonėms. Tai nėra medicininė konsultacija ar
        profesionalaus trenerio paslauga; už sprendimą jais naudotis atsakai pats (žr. 4 skyrių).
      </p>

      <h2>9. Paslaugos veikimas</h2>
      <p>
        Paslauga teikiama tokia, kokia yra. Stengiamės, kad ji veiktų sklandžiai, tačiau negalime
        garantuoti nepertraukiamo veikimo ir galime keisti ar nutraukti atskiras funkcijas.
      </p>
      <p>
        Varžybų ir klubų informacija surinkta iš viešai skelbiamų šaltinių ir gali pasikeisti –
        datas, registraciją ir tvarkaraščius tikrink organizatorių ar klubų svetainėse. Mitybos
        skaičiuoklės rezultatai yra apytiksliai ir nėra medicininė rekomendacija.
      </p>

      <h2>10. Atsakomybė</h2>
      <p>
        Mūsų atsakomybė ribojama tiek, kiek leidžia teisės aktai. Šios sąlygos neriboja vartotojų
        teisių, kurių pagal įstatymus apriboti negalima.
      </p>

      <h2>11. Sąlygų pakeitimai</h2>
      <p>
        Apie esminius pakeitimus pranešime ne vėliau kaip prieš 14 dienų programėlėje arba el.
        paštu. Jei su pakeitimais nesutinki, gali ištrinti paskyrą.
      </p>

      <h2>12. Taikoma teisė ir ginčai</h2>
      <p>
        Taikoma Lietuvos Respublikos teisė. Ginčus pirmiausia stengsimės išspręsti derybomis.
        Vartotojai taip pat gali kreiptis į Valstybinę vartotojų teisių apsaugos tarnybą (
        <a href="https://vvtat.lrv.lt" target="_blank" rel="noreferrer">
          vvtat.lrv.lt
        </a>
        ) arba į Lietuvos Respublikos teismus.
      </p>
    </LegalLayout>
  )
}
