import { Link } from 'react-router'
import { MIN_AGE, OPERATOR } from '../../content/legal'
import { LegalLayout } from './LegalLayout'

export function TermsPage() {
  return (
    <LegalLayout title="Naudojimosi sąlygos">
      <p>
        Šios sąlygos taikomos PaceMates programėlei ir svetainei (toliau – „paslauga“), kurią teikia{' '}
        {OPERATOR.name}. Registruojantis ar kitaip naudojantis paslauga, sutinki su šiomis
        sąlygomis ir <Link to="/privatumas">Privatumo politika</Link>.
      </p>

      <h2>1. Kas yra PaceMates</h2>
      <p>
        PaceMates padeda bėgikams ir dviratininkams rasti, su kuo kartu sportuoti. Treniruotes
        skelbia patys naudotojai. <strong>PaceMates treniruočių neorganizuoja, nevykdo ir
        nekontroliuoja</strong> – esame platforma, per kurią žmonės susitaria.
      </p>

      <h2>2. Paskyra</h2>
      <ul>
        <li>Registruotis gali asmenys nuo {MIN_AGE} metų.</li>
        <li>Nurodyk teisingą vardą ir el. paštą; vienas žmogus – viena paskyra.</li>
        <li>
          Saugok slaptažodį ir niekam jo neatskleisk. Už veiksmus savo paskyroje atsakai tu.
        </li>
      </ul>

      <h2>3. Elgesio taisyklės</h2>
      <p>Naudojantis paslauga draudžiama:</p>
      <ul>
        <li>skelbti melagingas ar klaidinančias treniruotes;</li>
        <li>siųsti šlamštą ar reklamą be mūsų sutikimo;</li>
        <li>įžeidinėti, grasinti, priekabiauti ar diskriminuoti kitus;</li>
        <li>skelbti kitų žmonių asmens duomenis be jų sutikimo;</li>
        <li>naudoti paslaugą neteisėtiems tikslams;</li>
        <li>bandyti apeiti saugumo priemones, trikdyti paslaugą ar automatiškai rinkti duomenis.</li>
      </ul>

      <h2>4. Sveikata ir saugumas</h2>
      <p>
        Fizinis aktyvumas susijęs su rizika. Treniruotėse dalyvauji <strong>savo
        atsakomybe</strong>:
      </p>
      <ul>
        <li>įvertink savo sveikatą ir pasirengimą; jei abejoji – pasitark su gydytoju;</li>
        <li>
          laikykis Kelių eismo taisyklių; dviračiu važiuok su šalmu, o tamsiu paros metu – su
          žibintais;
        </li>
        <li>susitik viešose vietose ir rinkis tempą pagal savo galimybes;</li>
        <li>organizatoriai paprastai nėra profesionalūs treneriai, nebent nurodyta kitaip.</li>
      </ul>
      <p>
        Kiek leidžia įstatymai, neatsakome už traumas, žalą ar nuostolius, patirtus treniruočių
        metu arba dėl kitų naudotojų veiksmų.
      </p>

      <h2>5. Tavo turinys</h2>
      <p>
        Tai, ką paskelbi (treniruotes, profilį, žinutes), lieka tavo. Suteiki mums neišimtinę,
        nemokamą teisę šį turinį rodyti paslaugoje tiek, kiek reikia jai teikti. Turinį,
        pažeidžiantį šias sąlygas ar įstatymus, galime pašalinti.
      </p>

      <h2>6. Paskyros sustabdymas ir ištrynimas</h2>
      <p>
        Pažeidus sąlygas, galime apriboti, sustabdyti ar ištrinti paskyrą. Tu gali bet kada
        ištrinti paskyrą skiltyje <Link to="/settings">Nustatymai</Link>.
      </p>

      <h2>7. Paslaugos veikimas</h2>
      <p>
        Paslauga teikiama tokia, kokia yra. Stengiamės, kad ji veiktų sklandžiai, tačiau
        negalime garantuoti nepertraukiamo veikimo ir galime keisti ar nutraukti atskiras
        funkcijas.
      </p>

      <h2>8. Atsakomybė</h2>
      <p>
        Mūsų atsakomybė ribojama tiek, kiek leidžia teisės aktai. Šios sąlygos neriboja
        vartotojų teisių, kurių pagal įstatymus apriboti negalima.
      </p>

      <h2>9. Sąlygų pakeitimai</h2>
      <p>
        Apie esminius pakeitimus pranešime ne vėliau kaip prieš 14 dienų programėlėje arba el.
        paštu. Jei su pakeitimais nesutinki, gali ištrinti paskyrą.
      </p>

      <h2>10. Taikoma teisė ir ginčai</h2>
      <p>
        Taikoma Lietuvos Respublikos teisė. Ginčus pirmiausia stengsimės išspręsti derybomis.
        Vartotojai taip pat gali kreiptis į Valstybinę vartotojų teisių apsaugos tarnybą (
        <a href="https://vvtat.lrv.lt" target="_blank" rel="noreferrer">vvtat.lrv.lt</a>) arba į
        Lietuvos Respublikos teismus.
      </p>
    </LegalLayout>
  )
}
