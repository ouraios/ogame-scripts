// ==UserScript==
// @name       Expe-3000
// @namespace  ulamfiolv357yhh7
// @version    4.0.6
// @description  Compte les expéditions
// @include https://*.ogame.gameforge.com/game/index.php?page=messages*
// @include https://*.ogame.gameforge.com/game/index.php?page=ingame&component=overview
// @include https://*.ogame.gameforge.com/game/index.php?page=combatreport*
// @updateURL https://github.com/ouraios/ogame-scripts/raw/master/expe-3000/expe-3000.user.js
// @downloadURL https://github.com/ouraios/ogame-scripts/raw/master/expe-3000/expe-3000.user.js
// @date       11 octobre 2012
// @author     Nitneuc and Quanxing and Ouraios -- Libre d'être modifié ou reproduit, tant que cette ligne @author reste complète
// @grant none
// @run-at document-end
// ==/UserScript==
/*
	**************************
	****** Informations ******
	**************************
	Expédition-3000:
	----------------
	https://github.com/ouraios/ogame-scripts/raw/master/expe-3000/expe-3000.user.js
	compatible : Firefox & Google chrome

	Variables persistantes stockées:
	--------------------------------
	*booléen=  texte.script+ "_"+ idPseudoJeu+ "_"+ universJeu+ "_"+ langue+ "_premiereExecution"
	*array=    texte.script+ "_"+ idPseudoJeu+ "_"+ universJeu+ "_"+ langue+ "_liste_message" (abandon)
	*string=   texte.script+ "_"+ idPseudoJeu+ "_"+ universJeu+ "_"+ langue+ "_dateInit"
	*array=    texte.script+ "_"+ idPseudoJeu+ "_"+ universJeu+ "_"+ langue+ "_liste_message_v2"
	*objet=    texte.script+ "_"+ idPseudoJeu+ "_"+ universJeu+ "_"+ langue+ "_compteur"
	*objet=    texte.script+ "_"+ idPseudoJeu+ "_"+ universJeu+ "_"+ langue+ "_liste_message_RC" // ce sont les messages d'expédition dont le(s) RC correspondant attend(ent) d'être lu
	*array=    texte.script+ "_"+ idPseudoJeu+ "_"+ universJeu+ "_"+ langue+ "_liste_position"
	*string=   texte.script+ "_"+ idPseudoJeu+ "_"+ universJeu+ "_"+ langue+ "_versionCourante" // sauvegarde de la version utilisée lors de la précédente exécution
	*array=	texte.script+ "_"+ idPseudoJeu+ "_"+ universJeu+ "_"+ langue+ "_issue_combat"
	*number=	texte.script+ "_"+ idPseudoJeu+ "_"+ universJeu+ "_"+ langue+ "_zone_epuisee"
	*array= 	texte.script+ "_"+ idPseudoJeu+ "_"+ universJeu+ "_"+ langue+ "_config_user"
	NOTE: Procédure d'ajout d'une variable persistante
	1) Initialisation données utilisateur (installation)
	3) MAJ (premier lancement)
	4) Début script
	5) Fin de tour


	Projets
	-------
	*Requête HTTP userscripts => sortir du toString() => incompatibilité FF
	*'RC détaillé' en fenêtre: pas d'id pseudo
	*%age combat avec/sans perte à arrondir

	*traduction à poursuivre
	*utiliser GM_info pour la version du script (voir topic 'script pour les nuls') chrome.x n'est pas reconnu (x= par exemple runtime)
	*bug manifest.json mal généré
	*proposer des sauvegardes quotidiennes/hebdo/mensuelles/anuelles/n jours paramétrables avec possibilité de restitution

	Traduction
	----------
	new Array("Small Cargo","S.Cargo"
	new Array("Large Cargo","L.Cargo"
	new Array("Light Fighter","L.Fighter"
	new Array("Heavy Fighter","H.Fighter"
	new Array("Cruiser","Cruiser"
	new Array("Battleship","Battleship"
	new Array("Colony ship","Col. Ship"
	new Array("Recycler","Recy."
	new Array("Espionage Probe","Esp.Probe"
	new Array("Bomber","Bomb."
	new Array("Destroyer","Destr."
	new Array("Death star","Death star"
	new Array("Battlecruiser","Battlecr."
	"aucun" "There was not even one small asteroid","expedition needed to be aborted","the expedition collapsed","unfortunately returned empty handed","didn't bring anything back","wasn't really successful","Nothing new could be obtained from the expedition","brings nothing thrilling back"
	new Array("pirates","9999CC","Pirates","primitive barbarians"),
	"aliens" "unknown species"
	"avance" "home earlier than expected"
	"retard" "longer than thought","As soon as the needed repair","return with a big delay","took quite some time","The return trip will take a bit longer","take a lot more time"
	new Array("ress_gain","Resources","FF99CC","You got Metal","You got Crystal","You got Deuterium"),
	"vaiss_gain" "The following ships are now part"
	"marchand" "with goods to trade to your worlds"
	"am" "You got Dark Matter"
	"trouNoir" "destroys the entire expedition","the fleet is never heard from again"
*/
(function () {
    var version_courante = "4.0.6";

    // ************************
    // ****** Prototypes ******
    // ************************

    function arraySortPosition(array) {
        array.sort((a, b) => {
            if (a[0] < b[0]) {
                return 1
            } else if (a[0] > b[0]) {
                return -1;
            } else {
                return 0;
            }
        })
    }

    function arraySomme(array) {
        return array.reduce((acc, val) => acc + val, 0)
    }

    function arrayAdditionTables(table1, table2) {
        var tableF = new Array();
        for (var tmp = 0; tmp < table1.length; tmp++) tableF[tmp] = table1[tmp] + table2[tmp];
        return tableF;
    }

    function arrayGetMinimumValue(array) {
        return array.reduce((acc, val) => {
            return (val < acc ? val : val);
        })
    }

    function arrayPercentage(array, somme, nbDec) {
        var tableF = new Array();
        for (var tmp = 0; tmp < array.length; tmp++) tableF[tmp] = (100 * array[tmp] / somme).arrondi_decimal(nbDec);
        return tableF;
    }

    function arrayAddRows(array, el, nLigne) {
        for (var tmp = this.length - 1; tmp >= nLigne; tmp--) this[tmp + 1] = this[tmp];
        this[nLigne] = el;
        return array;
    }

    Number.prototype.ajoutSeparateurMilliers = function (car) { // v1: fonction ; v2: prototype ; v2.1: prise en charge des nombres négatifs ; v2.2: prise en charge des nombre décimaux
        var dec = "";
        if (this < 0) var neg = true;
        if (this != Math.floor(this)) {
            dec = ((this - Math.floor(this)) + "").substr(1, (this + "").length - (Math.floor(this) + "").length);
            var str = Math.floor(this) + "";
        } else {
            var str = this + "";
        }
        if (neg) str = str.substring(1);
        var str_decoupe = new Array();
        for (var tmp = 0; tmp < Math.ceil(str.length / 3); tmp++) str_decoupe[tmp] = str.substring(str.length - 3 * tmp - 3, str.length - 3 * tmp); // on remplit un array() de groupes de 3 chiffres
        var str_2 = str_decoupe[str_decoupe.length - 1]; // on cree une string composée des groupes de 3 chiffres + du signe
        for (var tmp = str_decoupe.length - 2; tmp >= 0; tmp--) str_2 = str_2 + car + str_decoupe[tmp];
        if (neg) str_2 = "-" + str_2;
        return str_2 + dec;
    };

    Number.prototype.estPair = function () {
        return ((this / 2) == Math.floor(this / 2)) ? true : false;
    };

    Number.prototype.estEntier = function () {
        return (Math.round(this) == this) ? true : false;
    };

    Number.prototype.arrondi_decimal = function (nbDec) {
        return Math.round(this * Math.pow(10, nbDec)) / Math.pow(10, nbDec);
    };

    Number.prototype.toUniteRaccourci = function (nbDec) {
        if (this / 1000 > 1) {
            var lettre = "k";
            var coeff = 1000;
        }
        if (this / 1000000 > 1) {
            var lettre = "M";
            var coeff = 1000000;
        }
        if (this / 1000000000 > 1) {
            var lettre = "G";
            var coeff = 1000000000;
        }
        return (this / coeff).arrondi_decimal(nbDec) + " " + lettre;
    };

    Storage.prototype.setObj = function (key, obj) {
        return this.setItem(key, JSON.stringify(obj));
    };

    Storage.prototype.getObj = function (key) {
        return JSON.parse(this.getItem(key));
    };

    String.prototype.charAt_multi = function (pos, long) {
        var str = "";
        for (var a = pos; a < pos + long; a++) str = str + this.charAt(a);
        return str;
    };

    String.prototype.motSuivant = function (mot, carFinal) {
        if (this.indexOf(mot) == -1) return;
        var car = this.indexOf(mot) + mot.length + 1;
        return this.charAt_multi(car, this.substr(car, 30).indexOf(carFinal));
    };

    String.prototype.ajout0 = function () { // ajoute un 0 en début d'un nombre stringé pour qu'il ait 2 chiffres, si nécessaire
        return (this.length == 1) ? "0" + this : this;
    };


    // ****************************
    // ****** Fonctions hard ******
    // ****************************

    function ressource2point(nb) {
        return Math.floor(nb / 1000);
    }

    function elementExiste(table, el, supp) {
        for (var i = 0; i < table.length; i++)
            if (eval("table[i]" + supp) == el) return i;
        return -1;
    }

    function dateFormatOgame2date(date) { // transforme une date ogame au format objet 'Date'
        return new Date(date.split(".")[2].split(" ")[0], date.split(".")[1] - 1, date.split(".")[0], date.split(" ")[1].split(":")[0], date.split(":")[1], date.split(":")[2]);
    }

    function date2dateFormatOgame(date) { // transforme une date format objet 'Date' en date ogame
        return (date.getDate() + "").ajout0() + "." + (date.getMonth() + 1 + "").ajout0() + "." + date.getFullYear() + " " + (date.getHours() + "").ajout0() + ":" + (date.getMinutes() + "").ajout0() + ":" + (date.getSeconds() + "").ajout0();
    }

    function max_planete(table, n) { // fonction inventaireTools
        var table_temp = new Array();
        for (var tmp = 0; tmp < table.length; tmp++) table_temp[tmp] = table[tmp][1][n];
        return max_array(table_temp);
    }

    function max_array(liste) { // fonction récupérée sur http://www.journaldunet.com/ ; fonction inventaireTools
        var max = liste[0];
        for (var i = 0; i < liste.length; i++)
            if (liste[i] * 1 > max) max = liste[i];
        return max;
    }

    function jourActif() { // retourne le nombre de jours d'activité du script (entre  dateInit et aujourd'hui)
        return (((new Date()).getTime()) - (dateFormatOgame2date(dateInit).getTime())) / 86400000;
    }

    // ***********************************
    // ****** Fonctions d'affichage ******
    // ***********************************

    function afficher_formRExp(messageElement) {
        var elHTML = messageElement;
        var inner = elHTML.innerHTML;
        var ajoutHTML = '<div id="trouNoirParam" class="compteurExpe_tdPadding" align="center"><table class="compteurExpe_table2 compteurExpe_option"><tr><td>' + texte.trouNoir + '</td></tr>';
        for (var i = 0; i < vaisseau.length; i++) ajoutHTML += '<tr><td>' + vaisseau[i][0] + '</td><td><input type="text" id="trouNoir_vaiss' + i + '" value="0" size="4"/></td></tr>';
        ajoutHTML += '<tr><td align="center"><input type="button" id="boutonValider_trouNoir" value="' + texte.boutonValider_trouNoir + '"/></td></tr></table></div>';
        elHTML.innerHTML = inner + ajoutHTML;

        messageElement.querySelector("#boutonValider_trouNoir").addEventListener("click", function () {
            for (var tmp = 0; tmp < compteur_v2.vaiss_perte.length; tmp++) compteur_v2.vaiss_perte[tmp] += parseInt(messageElement.querySelector("#trouNoir_vaiss" + tmp).value);
            effacerContenu("trouNoirParam");
            affichage_alerte(texte.alerte_trouNoirParam, messageElement, "compteurExpe_alerteOK");
        }, false);
    }

    function creer_CSS() { // ajoute des classes CSS
        var headDocument = document.getElementsByTagName("head")[0];
        var inner = headDocument.innerHTML;
        var ajoutHTML = '<style type="text/css">' +
            '.compteurExpe_table1 { padding-bottom: 15px; width: 100%; }' +
            '.compteurExpe_table2 { width:100%; border-width: 3px; border-style: double; border-color: #666666; background-color:' + config.valeur_bgColor + '; text-align: center; font-size:' + config.valeur_fontSize + 'px ; }' +
            '.compteurExpe_tdPadding { padding: 7px; }' +
            '.compteurExpe_header1 { background-color:' + config.header1_bgColor + '; color:' + config.header1_fontColor + '; font-size:' + config.header1_fontSize + 'px ; font-weight:' + config.header1_fontBold + '; font-family:' + config.header1_textType + '; text-align:' + config.header1_textAlign + '; }' +
            '.compteurExpe_header2 { background-color:' + config.header2_bgColor + '; color:' + config.header2_fontColor + '; font-size:' + config.header2_fontSize + 'px ; font-weight:' + config.header2_fontBold + '; }' +
            '.compteurExpe_header1Ligne { text-align: left; padding-left: 3px; }' +
            '.compteurExpe_headerLigne { padding-left: 3px; background-color:' + config.headerLigne_bgColor + '; color:' + config.headerLigne_fontColor + '; font-size:' + config.headerLigne_fontSize + 'px ; font-weight:' + config.headerLigne_fontBold + '; text-align:' + config.headerLigne_textAlign + '; }' +
            '.compteurExpe_valeur { color:' + config.valeur_fontColor + '; font-weight:' + config.valeur_fontBold + '; }' +
            '.compteurExpe_valeurBis { background-color:' + config.valeurBis_bgColor + '; }' +
            '.compteurExpe_valeurTotal { background-color:' + config.valeurTotal_bgColor + '; color:' + config.valeurTotal_fontColor + '; font-size:' + config.valeurTotal_fontSize + 'px ; font-weight:' + config.valeurTotal_fontBold + '; }' +
            '.compteurExpe_alerte { color:' + config.alerte_fontColor + '; font-size:' + config.alerte_fontSize + 'px ; font-weight:' + config.alerte_fontBold + '; text-align:' + config.alerte_textAlign + '; }' +
            '.compteurExpe_alerteOK { background-color:' + config.alerteOK_bgColor + '; }' +
            '.compteurExpe_alerteAtt { background-color:' + config.alerteAtt_bgColor + '; }' +
            '.compteurExpe_alerteError { background-color:' + config.alerteError_bgColor + '; }' +
            '.compteurExpe_console { padding-left: 5px; border-width: 1px; border-style: double; border-color: #FFFFFF ; color:' + config.console_fontColor + '; font-size:' + config.console_fontSize + 'px ; font-weight:' + config.console_fontBold + '; font-family:' + config.console_textType + '; text-align:' + config.console_textAlign + '; }' +
            '.compteurExpe_dateInit { background-color:' + config.dateInit_bgColor + '; color:' + config.dateInit_fontColor + '; font-size:' + config.dateInit_fontSize + 'px ; font-weight:' + config.dateInit_fontBold + '; text-align:' + config.dateInit_textAlign + '; }' +
            '.compteurExpe_option { padding-left: 3px; color:' + config.option_fontColor + '; font-size:' + config.option_fontSize + 'px ; font-weight:' + config.option_fontBold + '; text-align: left; }' +
            '.compteurExpe_bouton { width:' + config.bouton_width + '; padding-left: 1px; }' +
            '#compteurExpe_titre .compteurExpe_bouton { background-color:' + config.header1_bgColor + '; }' +
            '#optionScript td { height:' + config.option_hauteurLigne + 'px ; }' +
            '</style>';
        headDocument.innerHTML = inner + ajoutHTML;
    }

    function creer_partieFixeTableaux(numTableau) { // Construction de la partie fixe tableaux affichés (les titres)
        // fabrique 4 variables globales chacune étant un tableau de 5 cases de la forme (x,y,header1,header2,headerLigne) où:
        // x: int; le nombre de colonnes
        // y: int; le nombre de lignes
        // header1: string; le titre général du tableau
        // header2: tableau de string; les titres des colonnes
        // headerLigne: tableau de string; les titres des lignes
        if (numTableau == 1) { // Tableau 'Résultats'
            var fixe = new Array(3, 14, texte.titre_h2_resultat, new Array(texte.titre_h3_resultat_resultat, texte.titre_h3_resultat_nombre, texte.titre_h3_resultat_pourct));
            fixe[4] = new Array();
            for (var i = 0; i < param_resultat.length; i++) fixe[4][i] = param_resultat[i][1];
            fixe[4][11] = texte.titre_hLigne_resultat_total;
        }
        if (numTableau == 2) { // Tableau 'Flotte'
            var fixe = new Array(4, 16, texte.titre_h2_flotte, new Array(texte.titre_h3_flotte_vaisseau, texte.titre_h3_flotte_gain, texte.titre_h3_flotte_perte, texte.titre_h3_flotte_solde));
            fixe[4] = new Array();
            for (var i = 0; i < vaisseau.length; i++) fixe[4][i] = vaisseau[i][0];
            fixe[4][15] = texte.titre_hLigne_flotte_ressources;
        }
        if (numTableau == 3) { // Tableau 'Ressources'
            var fixe = new Array(2, 6, texte.titre_h2_ressources, new Array(texte.titre_h3_ressources_ressource, texte.titre_h3_ressources_quantite));
            fixe[4] = new Array();
            for (var i = 0; i < ressource.length; i++) fixe[4][i] = ressource[i];
            fixe[4][3] = texte.antiMatiere;
        }
        // Tableau 'Points'
        if (numTableau == 4) var fixe = new Array(3, 5, texte.titre_h2_points, new Array(texte.titre_h3_points_domaine, texte.titre_h3_points_points, texte.titre_h3_points_pourct), new Array(texte.titre_hLigne_points_ressources, texte.titre_hLigne_points_flotte, texte.titre_hLigne_points_total));
        // Tableau 'Items'
        if (numTableau == 5) var fixe = new Array(5, 8, texte.titre_h2_item, new Array(texte.titre_h3_item_nom, item_niv_texte[0], item_niv_texte[1], item_niv_texte[2], texte.titre_h3_item_gain), item_nom_texte);
        // Tableau 'Autres stats'
        if (numTableau == 6) var fixe = new Array(3, 7, texte.titre_h2_divers, new Array(texte.titre_h3_divers_nom, texte.titre_h3_divers_nombre, texte.titre_h3_divers_pourct), new Array(texte.titre_hLigne_divers_resNeg, texte.titre_hLigne_divers_resNul, texte.titre_hLigne_divers_resPos, texte.titre_hLigne_divers_ptExp, texte.titre_hLigne_divers_zoneEpuisee));
        return fixe;
    }

    function affichage_alerte(texteAAfficher, elHTML, classType, identifiant) { // affiche alerte de confirmation ; le paramètre 'identifiant' est facultatif
        var inHTML = elHTML.innerHTML;
        var ajHTML = '<div id="' + identifiant + '" class="compteurExpe_alerte ' + classType + '">' + texteAAfficher + '</div>';
        elHTML.innerHTML = ajHTML + inHTML;
    }

    function afficherTable() {
        compteur_v22tableaux(0);
        var elHTML = document.getElementById("middle");
        var inner = elHTML.innerHTML;
        var ajoutHTML = '<div id="compteur-expe-dashboard"><div align="center"><table class="compteurExpe_table1">' +
            '<tr><td valign="top" class="compteurExpe_tdPadding">' +
            '<table width="100%"><tr><td>' +
            ecrireTableau(creer_partieFixeTableaux(1), compteur_v2.rapport_resultat, new Array(11, -1)) +
            '</td><td valign="top">' +
            '<table width="100%"><tr><td class="compteurExpe_tdPadding">' +
            ecrireTableau(creer_partieFixeTableaux(3), compteur_v2.rapport_ressources, new Array(-1, -1)) +
            '</td></tr><tr><td class="compteurExpe_tdPadding">' +
            ecrireTableau(creer_partieFixeTableaux(4), compteur_v2.rapport_points, new Array(2, -1)) +
            '</td></tr></table></td></tr></table></td></tr>' +
            '<tr><td id="compteurExpe_titre" class="compteurExpe_tdPadding"><table class="compteurExpe_table2"><tr><td colspan=2><table><tr><td id="boutonSpoiler" class="compteurExpe_bouton" valign="middle">'+
            `<svg title="${texte.boutonSpoiler_title}" style="height: 20px;width: 20px;cursor: pointer;" aria-hidden="true" focusable="false" data-prefix="fad" data-icon="sort-down" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 512" class="svg-inline--fa fa-sort-down fa-w-10 fa-7x"><g class="fa-group"><path fill="currentColor" d="M279.07 224.05h-238c-21.4 0-32.1-25.9-17-41l119-119a23.9 23.9 0 0 1 33.8-.1l.1.1 119.1 119c15.07 15.05 4.4 41-17 41z" class="fa-secondary" data-darkreader-inline-fill="" style="--darkreader-inline-fill:currentColor;"></path><path fill="currentColor" d="M296.07 329.05L177 448.05a23.9 23.9 0 0 1-33.8.1l-.1-.1-119-119c-15.1-15.1-4.4-41 17-41h238c21.37 0 32.04 25.95 16.97 41z" class="fa-primary" data-darkreader-inline-fill="" style="--darkreader-inline-fill:currentColor;"></path></g></svg>` + '</td>' +
            '<td class="compteurExpe_header1" width="' + (recuperer_CSSOgame_width() - 2 * config.bouton_width - 100) + 'px">' + texte.titre_h1_rapport + '<td class="compteurExpe_dateInit" width="100px">' + texte.version + ' ' + version_courante + '</td></td>' +
            '<td id="boutonOption" class="compteurExpe_bouton" valign="middle">'+
            `
            <svg style="height: 20px;width: 20px;cursor: pointer;" title="${texte.boutonOption_title}" aria-hidden="true" focusable="false" data-prefix="fas" data-icon="tools" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" class="svg-inline--fa fa-tools fa-w-16 fa-3x">
                <path fill="currentColor" d="M501.1 395.7L384 278.6c-23.1-23.1-57.6-27.6-85.4-13.9L192 158.1V96L64 0 0 64l96 128h62.1l106.6 106.6c-13.6 27.8-9.2 62.3 13.9 85.4l117.1 117.1c14.6 14.6 38.2 14.6 52.7 0l52.7-52.7c14.5-14.6 14.5-38.2 0-52.7zM331.7 225c28.3 0 54.9 11 74.9 31l19.4 19.4c15.8-6.9 30.8-16.5 43.8-29.5 37.1-37.1 49.7-89.3 37.9-136.7-2.2-9-13.5-12.1-20.1-5.5l-74.4 74.4-67.9-11.3L334 98.9l74.4-74.4c6.6-6.6 3.4-17.9-5.7-20.2-47.4-11.7-99.6.9-136.6 37.9-28.5 28.5-41.9 66.1-41.2 103.6l82.1 82.1c8.1-1.9 16.5-2.9 24.7-2.9zm-103.9 82l-56.7-56.7L18.7 402.8c-25 25-25 65.5 0 90.5s65.5 25 90.5 0l123.6-123.6c-7.6-19.9-9.9-41.6-5-62.7zM64 472c-13.2 0-24-10.8-24-24 0-13.3 10.7-24 24-24s24 10.7 24 24c0 13.2-10.7 24-24 24z" class="" data-darkreader-inline-fill="" style="--darkreader-inline-fill:currentColor;">                
                </path>
            </svg>
            `
            +'</td></tr></table></td></tr>' +
            '<tr><td class="compteurExpe_dateInit" width="' + (100 - config.console_width) + '%">' + texte.titre_h1_sousTitre + dateInit + '</td>' +
            '<td id="compteurExpe_console" style="background-color:' + config.console_bgColor + '" class="compteurExpe_console" width="' + config.console_width + '%">' + texte.console_base + '</td>' +
            '</tr></table></td></tr></table></div><div id="espace_contenuSpoiler"></div></div>';
        elHTML.innerHTML = inner + ajoutHTML;
        (config_user.spoilerDefault) ? afficherTable_secondaire() : ecouteBouton_option();
    }

    function afficherTable_secondaire() {
        compteur_v22tableaux(1);
        var elHTML_2 = document.getElementById("espace_contenuSpoiler");
        var inner_2 = elHTML_2.innerHTML;
        var ajoutHTML_2 = '<div align="center" id="contenuSpoiler"><table class="compteurExpe_table1"><tr><td class="compteurExpe_tdPadding">' +
            ecrireTableau(creer_partieFixeTableaux(2), compteur_v2.rapport_flotte, new Array(-1, 3)) +
            '</td></tr>';
        if (config_user.itemVisible) {
            ajoutHTML_2 += '<tr><td class="compteurExpe_tdPadding">' +
                ecrireTableau(creer_partieFixeTableaux(5), compteur_v2.rapport_item, new Array(-1, -1)) +
                '</td></tr>';
        }
        ajoutHTML_2 += '<tr><td class="compteurExpe_tdPadding">' +
            ecrireTableau(creer_partieFixeTableaux(6), compteur_v2.rapport_divers, new Array(-1, -1)) +
            '</td></tr><tr><td class="compteurExpe_tdPadding"><table class="compteurExpe_table2"><tr><td><img src="' + creer_graphique_img() + '"/></td><td>';
        if ((liste_position != null) || (arraySomme(issue_combat) != 0)) { // Partie de droite
            ajoutHTML_2 += '<div align="left" style="height:' + config.graph_img_h + 'px; width:' + Math.floor((recuperer_CSSOgame_width() - config.graph_img_w) * .7) + 'px; overflow:auto; margin-right:10px;">';

            if (liste_position != null) { // Liste des positions
                ajoutHTML_2 += '<table width="100%">'; // largeur du cadre = (largeur bande (donnée ogame) - largeur image google )*70%
                var somm = 0;
                for (var i = 0; i < liste_position.length; i++) {
                    ajoutHTML_2 += '<tr><td align="left">' + liste_position[i][0] + '</td><td align="right">' + liste_position[i][1] + ' ' + texte.liste_position_expedition;
                    if (liste_position[i][1] > 1) ajoutHTML_2 += 's';
                    ajoutHTML_2 += '</td></tr>';
                    somm += liste_position[i][1];
                }
                var expeNonRep = parseInt(compteur_v2.rapport_resultat[0][compteur_v2.rapport_resultat[0].length - 1]) - somm;
                if (expeNonRep != 0) {
                    ajoutHTML_2 += '<tr><td colspan=2>(' + expeNonRep + ' ' + texte.liste_position_nonRep;
                    if (expeNonRep > 1) ajoutHTML_2 += 's';
                    ajoutHTML_2 += ')</td></tr>';
                }
                ajoutHTML_2 += '<tr><td colspan=2><hr size=1></td></tr></table>';
            }

            if (arraySomme(issue_combat) != 0) { // Issues des combats
                var combatNonRep = compteur_v2.rapport_resultat[0][1] + compteur_v2.rapport_resultat[0][2] - arraySomme(issue_combat); // Les combats sauvegardés avant la MAJ de ce tableau sont considérés comme non listés

                ajoutHTML_2 += issue_combat[0] + ' ' + texte.issue_combat_combat;
                if (issue_combat[0] > 1) ajoutHTML_2 += 's';
                ajoutHTML_2 += ' ' + texte.issue_combat_0perte + ' (' + (100 * (issue_combat[0] / arraySomme(issue_combat))) + '%)<br>';
                ajoutHTML_2 += issue_combat[1] + ' ' + texte.issue_combat_combat;
                if (issue_combat[1] > 1) ajoutHTML_2 += 's';
                ajoutHTML_2 += ' ' + texte.issue_combat_perte + ' (' + (100 * (issue_combat[1] / arraySomme(issue_combat))) + '%)<br>';
                ajoutHTML_2 += arraySomme(issue_combat) + ' ' + texte.issue_combat_combat;
                if (arraySomme(issue_combat) > 1) ajoutHTML_2 += 's';
                ajoutHTML_2 += ' ' + texte.issue_combat_total + '<br>';
                ajoutHTML_2 += '(' + combatNonRep + ' ' + texte.issue_combat_nonRep;
                if (combatNonRep > 1) ajoutHTML_2 += 's';
                ajoutHTML_2 += ')';
            }
            ajoutHTML_2 += '</div>';
        }

        ajoutHTML_2 += '</td></tr></table></td></tr></table></div>';
        elHTML_2.innerHTML = inner_2 + ajoutHTML_2;
        ecouteBouton_option();
    }

    function creer_graphique_img() {
        var codeGraph = 'http://chart.apis.google.com/chart?cht=p&chf=bg,s,efefef00&chs=' + config.graph_img_w + 'x' + config.graph_img_h + '&chld=M&&chtt=' + texte.graphGoogle_titre + ' (' + compteur_v2.rapport_resultat[0][compteur_v2.rapport_resultat[0].length - 1] + ')&chl=';
        // Paramètres du graphique
        var ajoutHTML_2_1 = ""; // Légende
        var ajoutHTML_2_2 = ""; // Couleurs
        var ajoutHTML_2_3 = ""; // Valeurs
        for (var i = 0; i < param_resultat.length; i++) {
            ajoutHTML_2_1 += param_resultat[i][1] + '%20';
            ajoutHTML_2_2 += param_resultat_color[i];
            ajoutHTML_2_3 += compteur_v2.rapport_resultat[1][i];
            if (i != param_resultat.length - 1) {
                ajoutHTML_2_1 += '|';
                ajoutHTML_2_2 += ',';
                ajoutHTML_2_3 += ',';
            }
        }
        codeGraph += ajoutHTML_2_1 + '&chco=' + ajoutHTML_2_2 + '&chd=t:' + ajoutHTML_2_3;
        return codeGraph;
    }

    function creer_graphique_txt() {
        var codeGraph = '[color=#FFFFFF][size=' + config.BBCode_valeur_fontSize + '][b]';
        for (var i = 0; i < param_resultat.length; i++) {
            codeGraph += '[color=#FF' + ((i * 9) + '').ajout0() + '00]'; // .ajout0() pour que le 0 s'affiche 00
            for (var j = 0; j < config.graph_txt_w * (compteur_v2.rapport_resultat[1][i] / 100); j++) codeGraph += "█";
            codeGraph += '[/color] ' + param_resultat[i][1] + ' - ' + compteur_v2.rapport_resultat[0][i] + '\n';
        }
        codeGraph += '[/b][/size][/color]';
        return codeGraph;
    }

    function afficherOption() {
        var elHTML_3 = document.querySelector('#compteur-expe-dashboard');
        var ajoutHTML_3 = '<div id="optionScript" class="compteurExpe_tdPadding" align="center"><table class="compteurExpe_table2 compteurExpe_option"><tr><td>' + texte.option_nbDec + '</td><td><input type="text" id="option_nbDec" size="2" maxlength="1" value="' + config_user.nbDec + '"/></td></tr>' +
            '<tr><td>' + texte.option_delaiActualisation + '</td><td><input type="text" id="option_delaiActualisation" value="' + config_user.delaiActualisation + '"/></td></tr>' +
            '<tr><td>' + texte.option_spoilerDefault + '</td><td><input type="radio" value="true" name="option_spoilerDefault" id="option_spoilerDefault_aff"/><label for="option_spoilerDefault_aff">' + texte.option_spoilerDefault_aff + '</label>' +
            '<input type="radio" value="false" name="option_spoilerDefault" id="option_spoilerDefault_mas"/><label for="option_spoilerDefault_mas">' + texte.option_spoilerDefault_mas + '</label></td></tr>' +
            '<tr><td>' + texte.option_itemVisible + '</td><td><input type="radio" value="true" name="option_itemVisible" id="option_itemVisible_aff"/><label for="option_itemVisible_aff">' + texte.option_itemVisible_aff + '</label>' +
            '<input type="radio" value="false" name="option_itemVisible" id="option_itemVisible_mas"/><label for="option_itemVisible_mas">' + texte.option_itemVisible_mas + '</label></td></tr>' +
            '<tr><td>' + texte.option_conservationMessages_marge + '</td><td><input type="text" id="option_conservationMessages_marge" value="' + config_user.conservationMessages_marge + '"/></td></tr>' +
            '<tr><td>' + texte.option_uniteRaccourci + '</td><td><input type="radio" value="true" name="option_uniteRaccourci" id="option_uniteRaccourci_complet"/><label for="option_uniteRaccourci_complet">' + texte.option_uniteRaccourci_complet + '</label>' +
            '<input type="radio" value="false" name="option_uniteRaccourci" id="option_uniteRaccourci_racc"/><label for="option_uniteRaccourci_racc">' + texte.option_uniteRaccourci_racc + '</label></td></tr>' +
            '<tr><td>' + texte.option_uniteRaccourci_seuil + '</td><td><input type="radio" value="k" name="option_uniteRaccourci_seuil" id="option_uniteRaccourci_seuil_k"/><label for="option_uniteRaccourci_seuil_k">' + texte.option_uniteRaccourci_seuil_k + '</label>' +
            '<input type="radio" value="m" name="option_uniteRaccourci_seuil" id="option_uniteRaccourci_seuil_m"/><label for="option_uniteRaccourci_seuil_m">' + texte.option_uniteRaccourci_seuil_m + '</label>' +
            '<input type="radio" value="g" name="option_uniteRaccourci_seuil" id="option_uniteRaccourci_seuil_g"/><label for="option_uniteRaccourci_seuil_g">' + texte.option_uniteRaccourci_seuil_g + '</label>	</td></tr>' +
            '<tr><td align="center"><input type="button" id="boutonValider" value="' + texte.boutonValider + '"/></td></tr>' +
            '<tr><td>' + texte.boutonBBCode_title + '</td><td id="boutonBBCode" class="compteurExpe_bouton" valign="middle"><svg style="height: 20px;width: 20px;cursor: pointer;" title="' + texte.boutonBBCode_title + '" aria-hidden="true" focusable="false" data-prefix="far" data-icon="code" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512" class="svg-inline--fa fa-code fa-w-18 fa-3x"><path fill="currentColor" d="M234.8 511.7L196 500.4c-4.2-1.2-6.7-5.7-5.5-9.9L331.3 5.8c1.2-4.2 5.7-6.7 9.9-5.5L380 11.6c4.2 1.2 6.7 5.7 5.5 9.9L244.7 506.2c-1.2 4.3-5.6 6.7-9.9 5.5zm-83.2-121.1l27.2-29c3.1-3.3 2.8-8.5-.5-11.5L72.2 256l106.1-94.1c3.4-3 3.6-8.2.5-11.5l-27.2-29c-3-3.2-8.1-3.4-11.3-.4L2.5 250.2c-3.4 3.2-3.4 8.5 0 11.7L140.3 391c3.2 3 8.2 2.8 11.3-.4zm284.1.4l137.7-129.1c3.4-3.2 3.4-8.5 0-11.7L435.7 121c-3.2-3-8.3-2.9-11.3.4l-27.2 29c-3.1 3.3-2.8 8.5.5 11.5L503.8 256l-106.1 94.1c-3.4 3-3.6 8.2-.5 11.5l27.2 29c3.1 3.2 8.1 3.4 11.3.4z" class="" data-darkreader-inline-fill="" style="--darkreader-inline-fill:currentColor;"></path></svg></td></tr>' +
            '<tr><td>' + texte.boutonForum_title + '</td><td class="compteurExpe_bouton" valign="middle"><a href="' + config.boutonForum_lien + '" target="_blank"><svg style="height: 20px;width: 20px;cursor: pointer;" title="' + texte.boutonForum_title + '" aria-hidden="true" focusable="false" data-prefix="far" data-icon="external-link" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" class="svg-inline--fa fa-external-link fa-w-16 fa-7x"><path fill="currentColor" d="M497.6,0,334.4.17A14.4,14.4,0,0,0,320,14.57V47.88a14.4,14.4,0,0,0,14.69,14.4l73.63-2.72,2.06,2.06L131.52,340.49a12,12,0,0,0,0,17l23,23a12,12,0,0,0,17,0L450.38,101.62l2.06,2.06-2.72,73.63A14.4,14.4,0,0,0,464.12,192h33.31a14.4,14.4,0,0,0,14.4-14.4L512,14.4A14.4,14.4,0,0,0,497.6,0ZM432,288H416a16,16,0,0,0-16,16V458a6,6,0,0,1-6,6H54a6,6,0,0,1-6-6V118a6,6,0,0,1,6-6H208a16,16,0,0,0,16-16V80a16,16,0,0,0-16-16H48A48,48,0,0,0,0,112V464a48,48,0,0,0,48,48H400a48,48,0,0,0,48-48V304A16,16,0,0,0,432,288Z" class="" data-darkreader-inline-fill="" style="--darkreader-inline-fill:currentColor;"></path></svg></a></td></tr>' +
            '<tr><td>' + texte.boutonMAJ_title + '</td><td class="compteurExpe_bouton" valign="middle"><a href="' + config.boutonMAJ_lien + '"><svg style="height: 20px;width: 20px;cursor: pointer;" title="' + texte.boutonMAJ_title + '" aria-hidden="true" focusable="false" data-prefix="far" data-icon="sync-alt" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" class="svg-inline--fa fa-sync-alt fa-w-16 fa-7x"><path fill="currentColor" d="M483.515 28.485L431.35 80.65C386.475 35.767 324.485 8 256 8 123.228 8 14.824 112.338 8.31 243.493 7.971 250.311 13.475 256 20.301 256h28.045c6.353 0 11.613-4.952 11.973-11.294C66.161 141.649 151.453 60 256 60c54.163 0 103.157 21.923 138.614 57.386l-54.128 54.129c-7.56 7.56-2.206 20.485 8.485 20.485H492c6.627 0 12-5.373 12-12V36.971c0-10.691-12.926-16.045-20.485-8.486zM491.699 256h-28.045c-6.353 0-11.613 4.952-11.973 11.294C445.839 370.351 360.547 452 256 452c-54.163 0-103.157-21.923-138.614-57.386l54.128-54.129c7.56-7.56 2.206-20.485-8.485-20.485H20c-6.627 0-12 5.373-12 12v143.029c0 10.691 12.926 16.045 20.485 8.485L80.65 431.35C125.525 476.233 187.516 504 256 504c132.773 0 241.176-104.338 247.69-235.493.339-6.818-5.165-12.507-11.991-12.507z" class="" data-darkreader-inline-fill="" style="--darkreader-inline-fill:currentColor;"></path></svg></a></td></tr>' +
            '<tr><td>' + texte.boutonDefault_title + '</td><td id="boutonDefault" class="compteurExpe_bouton" valign="middle"><svg style="height: 20px;width: 20px;cursor: pointer;" title="' + texte.boutonDefault_title + '" aria-hidden="true" focusable="false" data-prefix="fas" data-icon="trash-alt" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" class="svg-inline--fa fa-trash-alt fa-w-14 fa-3x"><path fill="currentColor" d="M32 464a48 48 0 0 0 48 48h288a48 48 0 0 0 48-48V128H32zm272-256a16 16 0 0 1 32 0v224a16 16 0 0 1-32 0zm-96 0a16 16 0 0 1 32 0v224a16 16 0 0 1-32 0zm-96 0a16 16 0 0 1 32 0v224a16 16 0 0 1-32 0zM432 32H312l-9.4-18.7A24 24 0 0 0 281.1 0H166.8a23.72 23.72 0 0 0-21.4 13.3L136 32H16A16 16 0 0 0 0 48v32a16 16 0 0 0 16 16h416a16 16 0 0 0 16-16V48a16 16 0 0 0-16-16z" class="" data-darkreader-inline-fill="" style="--darkreader-inline-fill:currentColor;"></path></svg></td></tr>' +
            '<tr><td>' + texte.boutonInstall_title + '</td><td id="boutonInstall" class="compteurExpe_bouton" valign="middle"><svg style="height: 20px;width: 20px;cursor: pointer;" title="' + texte.boutonInstall_title + '" aria-hidden="true" focusable="false" data-prefix="fas" data-icon="trash-alt" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" class="svg-inline--fa fa-trash-alt fa-w-14 fa-3x"><path fill="currentColor" d="M32 464a48 48 0 0 0 48 48h288a48 48 0 0 0 48-48V128H32zm272-256a16 16 0 0 1 32 0v224a16 16 0 0 1-32 0zm-96 0a16 16 0 0 1 32 0v224a16 16 0 0 1-32 0zm-96 0a16 16 0 0 1 32 0v224a16 16 0 0 1-32 0zM432 32H312l-9.4-18.7A24 24 0 0 0 281.1 0H166.8a23.72 23.72 0 0 0-21.4 13.3L136 32H16A16 16 0 0 0 0 48v32a16 16 0 0 0 16 16h416a16 16 0 0 0 16-16V48a16 16 0 0 0-16-16z" class="" data-darkreader-inline-fill="" style="--darkreader-inline-fill:currentColor;"></path></svg></td></tr></table></div>';
        elHTML_3.insertAdjacentHTML( 'beforeend', ajoutHTML_3 );
        // checked par défaut
        (config_user.spoilerDefault) ? document.getElementById("option_spoilerDefault_aff").setAttribute("checked", "checked") : document.getElementById("option_spoilerDefault_mas").setAttribute("checked", "checked");
        (config_user.itemVisible) ? document.getElementById("option_itemVisible_aff").setAttribute("checked", "checked") : document.getElementById("option_itemVisible_mas").setAttribute("checked", "checked");
        (config_user.uniteRaccourci) ? document.getElementById("option_uniteRaccourci_complet").setAttribute("checked", "checked") : document.getElementById("option_uniteRaccourci_racc").setAttribute("checked", "checked");
        document.getElementById("option_uniteRaccourci_seuil_" + config_user.uniteRaccourci_seuil).setAttribute("checked", "checked");
        ecouteBouton_option();
    }

    function afficher_BBCode() {
        var elHTML_4 = document.querySelector('#compteur-expe-dashboard');
        var inner_4 = elHTML_4.innerHTML;
        var ajoutHTML_4 = '<div id="BBCode" class="compteurExpe_tdPadding" align="center"><table width="100%" class="compteurExpe_table2 compteurExpe_option compteurExpe_tdPadding"><tr><td>' + texte.option_BBCode + '<br><textarea name="BBCode" cols="' + config.option_BBCode_textArea_w + '" rows="' + config.option_BBCode_textArea_h + '">' + ecrireBBCode() + '</textarea></td></tr>' +
            '<tr><td><table width="100%"><tr><td>' + texte.option_BBCode_titre + '</td>' +
            '<td><label for="option_BBCode_titre_pseudo">' + texte.option_BBCode_titre_pseudo + '</label></td><td><input type="checkbox" value="pseudo" id="option_BBCode_titre_pseudo"/>' +
            '<td><label for="option_BBCode_titre_uni">' + texte.option_BBCode_titre_uni + '</label></td><td><input type="checkbox" value="uni" id="option_BBCode_titre_uni"/>' +
            '<td><label for="option_BBCode_titre_langue">' + texte.option_BBCode_titre_langue + '</label></td><td><input type="checkbox" value="langue" id="option_BBCode_titre_langue"/></td></tr></table>' +
            '<tr><td>' + texte.option_BBCode_perso + '<br><textarea id="option_BBCode_perso" cols="' + config.option_BBCode_textArea_w + '" rows="' + config.option_BBCode_textArea_perso_h + '">' + config_user.option_BBCode_perso + '</textarea></td></tr>' +
            '<tr><td><table width="100%"><tr><td>' + texte.option_BBCode_perso_place + '</td><td><input type="radio" value="haut" name="option_BBCode_perso_place" id="option_BBCode_perso_place_haut"/><label for="option_BBCode_perso_place_haut">' + texte.option_BBCode_perso_place_haut + '</label></td>' +
            '<td><input type="radio" value="bas" name="option_BBCode_perso_place" id="option_BBCode_perso_place_bas"/><label for="option_BBCode_perso_place_bas">' + texte.option_BBCode_perso_place_bas + '</label></td>' +
            '<td><input type="radio" value="mas" name="option_BBCode_perso_place" id="option_BBCode_perso_place_mas"/><label for="option_BBCode_perso_place_mas">' + texte.option_BBCode_perso_place_mas + '</label></td></tr></table></td></tr>' +
            '<tr><td align="center"><input type="button" id="boutonValider_BBCode" value="' + texte.boutonValider_BBCode + '"/></td></tr>' +
            '</table></div>';
        elHTML_4.insertAdjacentHTML( 'beforeend', ajoutHTML_4 );
        // checked par défaut
        if (config_user.option_BBCode_titre_pseudo) document.getElementById("option_BBCode_titre_pseudo").checked = true;
        if (config_user.option_BBCode_titre_uni) document.getElementById("option_BBCode_titre_uni").checked = true;
        if (config_user.option_BBCode_titre_langue) document.getElementById("option_BBCode_titre_langue").checked = true;
        document.getElementById("option_BBCode_perso_place_" + config_user.option_BBCode_perso_place).checked = true;
        ecouteBouton_option();
    }

    function effacerContenu(idAEffacer) {
        var table_secondaire = document.getElementById(idAEffacer);
        table_secondaire.parentNode.removeChild(table_secondaire);
    }

    function ecouteBouton_option() { // attente action utilisateur sur les boutons
        document.getElementById("boutonSpoiler").addEventListener("click", function () {
            (document.getElementById("contenuSpoiler")) ? effacerContenu("contenuSpoiler") : afficherTable_secondaire();
        }, false);
        document.getElementById("boutonOption").addEventListener("click", function () {
            (document.getElementById("optionScript")) ? effacerContenu("optionScript") : afficherOption();
        }, false);
        if (document.getElementById("boutonInstall")) document.getElementById("boutonInstall").addEventListener("click", function () { // ecoute bouton si ce bouton est affiché
            modifierConsole(config.alerteError_bgColor, texte.console_installDebut);
            ((confirm(texte.confirm_Install)) && (confirm(texte.confirm_Install_2))) ? initialiserDonneesUtilisateur() : modifierConsole(config.alerteError_bgColor, texte.console_installAnnulee); // les 2 clics de confirmation
        }, false);
        if (document.getElementById("boutonValider")) document.getElementById("boutonValider").addEventListener("click", function () {
            modifier_config(new Array(option_nbDec.value, option_delaiActualisation.value, interpreter_boutonRadio(new Array(option_spoilerDefault_aff, option_spoilerDefault_mas)), option_conservationMessages_marge.value, interpreter_boutonRadio(new Array(option_itemVisible_aff, option_itemVisible_mas)), interpreter_boutonRadio(new Array(option_uniteRaccourci_complet, option_uniteRaccourci_racc)), interpreter_boutonRadio(new Array(option_uniteRaccourci_seuil_k, option_uniteRaccourci_seuil_m, option_uniteRaccourci_seuil_g))));
            effacerContenu("optionScript");
        }, false);
        if (document.getElementById("boutonDefault")) document.getElementById("boutonDefault").addEventListener("click", function () {
            modifierConsole(config.alerteError_bgColor, texte.console_optionDebut);
            if (confirm(texte.confirm_default)) {
                default_config();
                liste_position = arraySortPosition(liste_position);
                localStorage.setObj(scriptKeyLocalStorage + "_liste_position", liste_position);
                modifierConsole(config.alerteOK_bgColor, texte.console_optionFin);
                effacerContenu("optionScript");
            } else modifierConsole(config.alerteError_bgColor, texte.console_optionAnnulee);
        }, false);
        if (document.getElementById("boutonValider_BBCode")) document.getElementById("boutonValider_BBCode").addEventListener("click", function () { // ecoute bouton si ce bouton est affiché
            modifier_config(new Array("", "", "", "", "", "", "",
                interpreter_boutonCheckbox(new Array(option_BBCode_titre_pseudo, option_BBCode_titre_uni, option_BBCode_titre_langue)),
                interpreter_boutonRadio(new Array(option_BBCode_perso_place_haut, option_BBCode_perso_place_bas, option_BBCode_perso_place_mas)),
                document.getElementById("option_BBCode_perso").value));
            effacerContenu("BBCode");
        }, false);
        if (document.getElementById("boutonBBCode")) document.getElementById("boutonBBCode").addEventListener("click", function () {
            (document.getElementById("BBCode")) ? effacerContenu("BBCode") : afficher_BBCode();
        }, false);
    }

    function ecrireTableau(fixe, contenu, lTotal) { // fixe est d'un format particulier, renvoyé par la fonction 'creer_partieFixeTableaux' ; lTotal est le numéro de ligne ou de colonne à marquer de la classe 'compteurExpe_valeurTotal', array de 2 cases
        var code = '<table class="compteurExpe_table2 compteurExpe_valeur"><tr><td colspan="' + fixe[0] + '" class="compteurExpe_header2">' + fixe[2] + '</td></tr><tr>';
        for (var i = 0; i < fixe[3].length; i++) {
            code += '<td class="compteurExpe_header2';
            if (i == 0) code += ' compteurExpe_header1Ligne';
            code += '">' + fixe[3][i] + '</td>';
        }
        for (var i = 0; i < fixe[4].length; i++) {
            for (var j = 0; j < fixe[3].length; j++) {
                if (j == 0) {
                    code += '<tr><td class="compteurExpe_headerLigne';
                    if (!i.estPair()) code += ' compteurExpe_valeurBis';
                    if (i == lTotal[0]) code += ' compteurExpe_valeurTotal';
                    code += '">' + fixe[4][i] + '</td>';
                } else {
                    code += '<td';
                    if ((i == lTotal[0]) || (j == lTotal[1])) code += ' class="compteurExpe_valeurTotal"';
                    if (!i.estPair()) code += ' class="compteurExpe_valeurBis"';
                    if (typeof contenu[j - 1][i] != "number") {
                        code += '>' + contenu[j - 1][i] + '</td>';
                    } else {
                        code += '>';
                        if ((config_user.uniteRaccourci) &&
                            (((config_user.uniteRaccourci_seuil == "k") && (contenu[j - 1][i] >= 1000)) ||
                                ((config_user.uniteRaccourci_seuil == "m") && (contenu[j - 1][i] >= 1000000)) ||
                                ((config_user.uniteRaccourci_seuil == "g") && (contenu[j - 1][i] >= 1000000)))) {
                            code += contenu[j - 1][i].toUniteRaccourci(config_user.nbDec) + '</td>';
                        } else {
                            code += contenu[j - 1][i].ajoutSeparateurMilliers(config.separateurMilliers) + '</td>';
                        }
                    }
                }
            }
            code += '</tr>';
        }
        code += '</tr></table>';
        return code;
    }

    function ecrireBBCode() {
        var BBCode = '[align=center][size=' + config.BBCode_intro_fontSize + '][color=#FF9900][b]Rapport expéditions';
        if (config_user.option_BBCode_titre_pseudo) BBCode += ' de [color=#FFFF00]' + pseudoJeu + '[/color]';
        if (config_user.option_BBCode_titre_uni) BBCode += ', univers [color=#FFFF00]' + universJeu + '[/color]';
        if (config_user.option_BBCode_titre_langue) {
            BBCode += '[color=#FFFF00]';
            if (config_user.option_BBCode_titre_uni) BBCode += '.' + langue + '[/color]';
            else BBCode += ', ogame.' + langue + '[/color]';
        }
        BBCode += '[/b][/color][/size][/align]\n';

        if (config_user.option_BBCode_perso_place == "haut") BBCode += config_user.option_BBCode_perso;
        BBCode += ecrireTableau_BBCode(creer_partieFixeTableaux(1), compteur_v2.rapport_resultat, new Array(11, -1)) + '\n' +
            creer_graphique_txt() + '\n' +
            ecrireTableau_BBCode(creer_partieFixeTableaux(3), compteur_v2.rapport_ressources, new Array(-1, -1)) +
            ecrireTableau_BBCode(creer_partieFixeTableaux(4), compteur_v2.rapport_points, new Array(2, -1)) +
            ecrireTableau_BBCode(creer_partieFixeTableaux(2), compteur_v2.rapport_flotte, new Array(-1, 3)) +
            ecrireTableau_BBCode(creer_partieFixeTableaux(5), compteur_v2.rapport_item, new Array(-1, -1)) +
            ecrireTableau_BBCode(creer_partieFixeTableaux(6), compteur_v2.rapport_divers, new Array(-1, -1)) +
            '\n\n[size=' + config.BBCode_valeur_fontSize + '][color=#3333FF]Première expédition comptabilisée le [color=#3399FF]' + dateInit + '[/color][/color][/size]\n';
        if (config_user.option_BBCode_perso_place == "bas") BBCode += config_user.option_BBCode_perso + '\n';
        BBCode += '[size=' + config.BBCode_conclu_fontSize + '][color=#FF9900]BBCode généré le: [color=#FFFF00]' + date2dateFormatOgame(new Date()) + '[/color] ' +
            'par le script [url="' + config.boutonForum_lien + '"][u][color=#FFFF00]' + texte.script_texte + ' v' + version_courante + '[/color][/u][/url][/color][/color][/size]';
        return BBCode;
    }

    function ecrireTableau_BBCode(fixe, contenu, lTotal) {
        var code = '[color=' + config.header2_fontColor + '][align=center][size=' + config.BBCode_header_fontSize + '][u]' + fixe[2] + '[/u][/size][/align]\n';
        for (var i = 0; i < fixe[3].length; i++) {
            code += fixe[3][i];
            if (i != fixe[3].length - 1) code += config.BBCode_separateur;
        }
        code += '[/color]\n[size=' + config.BBCode_valeur_fontSize + '][color=' + config.BBCode_separation_fontColor + ']';
        for (var j = 0; j < fixe[3].length; j++) code += '----------------';
        code += '\n[/color][color=' + config.valeur_fontColor + ']';
        for (var i = 0; i < fixe[4].length; i++) {
            for (var j = 0; j < fixe[3].length; j++) {
                if (j == 0) {
                    code += (i == lTotal[0]) ? '[color=' + config.valeurTotal_fontColor + '][b]' : '[color=' + config.headerLigne_fontColor + ']';
                    code += fixe[4][i];
                    if (i == lTotal[0]) code += '[/b]';
                    code += config.BBCode_separateur + '[/color]';
                } else {
                    code += ((i == lTotal[0]) || (j == lTotal[1])) ? '[color=' + config.valeurTotal_fontColor + '][b]' : '[color=#33' + j * 33 + 'FF]';
                    code += (typeof contenu[j - 1][i] == "number") ? contenu[j - 1][i].ajoutSeparateurMilliers(config.separateurMilliers) : contenu[j - 1][i];
                    if (j != fixe[3].length - 1) code += config.BBCode_separateur; // on affiche pas le séparateur dans la dernière colonne des tables
                    if ((i == lTotal[0]) || (j == lTotal[1])) code += '[/b]';
                    code += '[/color]';
                }
            }
            code += '\n';
        }
        code += '[/size]';
        return code;
    }

    function modifierConsole(couleur, texte) { // l'attribut style et le contenu inner du td 'console' sont modifiés ici
        if (document.getElementById("compteurExpe_console")) { // la console se modifie seulement si elle est affiché (of course !!)
            var consoleTmp = document.getElementById("compteurExpe_console");
            consoleTmp.setAttribute("style", "background-color:" + couleur);
            consoleTmp.innerHTML = texte;
        }
    }

    function patch(){
        localStorage.setObj(scriptKeyLocalStorage + "_list_harvest", new Array());
    }

    // ***********************************
    // ****** Construction d'objets ******
    // ***********************************

    function messageExpe(contenu) { // construction de l'objet 'messageExpe'
        this.id = contenu.dataset.msgId;
        this.date = contenu.querySelector('.msg_date').textContent;
        this.coord = contenu.querySelector('.msg_title').textContent.match(/\d+:\d+:\d+/)[0];
        this.coord = this.coord.split(":")[0] + "." + this.coord.split(":")[1];

        var contenu_texte = contenu.querySelector('.msg_content').innerHTML;
        this.mess_sonde = message_sonde(contenu_texte); // mess_sonde est un entier, + élevé = + alerte élevée

        for (var i = 0; i < param_resultat.length; i++)
            for (var j = 2; j < param_resultat[i].length; j++)
                if (contenu_texte.indexOf(param_resultat[i][j]) != -1) this.resultat = param_resultat[i][0]; // recherche du type d'expédition par les mots clefs du message

        if (this.resultat == param_resultat[6][0]) {
            this.vaiss_gain = new Array(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0); // recherche de vaisseaux gagnés
            for (var i = 0; i < vaisseau.length; i++)
                if (contenu_texte.indexOf(vaisseau[i][0]) != -1) this.vaiss_gain[i] = parseInt(contenu_texte.match(new RegExp(vaisseau[i][0] + ': (\\d+)'))[1]);
        }
        if (this.resultat == param_resultat[5][0]) {
            this.ress_gain = new Array(0, 0, 0); // recherche de ressources gagnées
            for (var i = 0; i <= ressource.length; i++)
                if (contenu_texte.indexOf(ressource[i]) != -1) this.ress_gain[i] = parseInt(contenu_texte.match(new RegExp(ressource[i] + ' ([\\d.]+)'))[1].replace(/\./g, ''));
        }
        if (this.resultat == param_resultat[8][0]) this.am_gain = parseInt(contenu_texte.match(new RegExp('\\(AM\\) ([\\d.]+)'))[1].replace(/\./g, ''));

        if (this.resultat == param_resultat[10][0]) {
            this.item = new Array(new Array(0, 0, 0), new Array(0, 0, 0), new Array(0, 0, 0), new Array(0, 0, 0), new Array(0, 0, 0), new Array(0, 0, 0));
            var nom = -1;
            var niv = -1;
            for (var i = 0; i < item_nom.length; i++)
                if (contenu_texte.indexOf(item_nom[i]) != -1) nom = i;
            for (var i = 0; i < item_niv.length; i++)
                if (contenu_texte.indexOf("en " + item_niv[i]) != -1) niv = i; // obligé d'ajouter 'en ' pour ne pas confondre 'or' avec des mots contenant 'or'
            if ((nom != -1) && (niv != -1)) this.item[nom][niv] += 1;
            else delete this.resultat; // si l'un des éléments (ni=om ou niv) n'a pas été reconnu, pour que la fonction 'parcours_message' le considère comme 'message non reconnu'
        }
    }

    function messageExpe_RC(message) { // construction de l'objet 'messageExpe_RC' ; l'objet 'messageExpe' correspondant est passé en paramètre ; au moment de la construction de l'objet, les RC n'ont pas été consultés ; Le paramètre 'ress_vaiss_perte' sera construit plus tard ; 'vaiss_perte ne sera jamais construit car cet objet sera supprimé dès que l'user consultera la page 'RC détaillé'
        this.id = message.id;
        this.date = message.date;
        this.resultat = message.resultat;
    }

    function compteurExpe(liste) { // construction de l'objet compteurExpe ; Intitialisation des sommes
        this.resultat = new Array(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
        this.am_gain = 0;
        this.ress_gain = new Array(0, 0, 0);
        this.vaiss_gain = new Array(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
        this.vaiss_perte = new Array(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
        this.ress_vaiss_perte = 0;
        this.item = new Array(new Array(0, 0, 0), new Array(0, 0, 0), new Array(0, 0, 0), new Array(0, 0, 0), new Array(0, 0, 0), new Array(0, 0, 0));
        this.ress_item_gain = new Array(0, 0, 0);
    }

    function incrementation_compteur_v2(compteurIncr, donnee) { // v2 ; Etant impossible d'appliquer correctement des méthodes à un objet sorti d'une variable persistante par la méthode JSON, c'est une fonction qui est chargée d'incrémenter le compteur
        for (var j = 0; j < param_resultat.length; j++)
            if (donnee.resultat == param_resultat[j][0]) compteurIncr.resultat[j]++;
        if (donnee.resultat == param_resultat[8][0]) compteurIncr.am_gain = compteurIncr.am_gain + donnee.am_gain;
        if (donnee.resultat == param_resultat[5][0]) compteurIncr.ress_gain = arrayAdditionTables(compteurIncr.ress_gain, donnee.ress_gain);
        if (donnee.resultat == param_resultat[6][0]) compteurIncr.vaiss_gain = arrayAdditionTables(compteurIncr.vaiss_gain, donnee.vaiss_gain);
        if (typeof donnee.vaiss_perte != "undefined") compteurIncr.vaiss_perte = arrayAdditionTables(compteurIncr.vaiss_perte, donnee.vaiss_perte);
        if (typeof donnee.ress_vaiss_perte != "undefined") compteurIncr.ress_vaiss_perte = compteurIncr.ress_vaiss_perte + donnee.ress_vaiss_perte;
        if (donnee.resultat == param_resultat[10][0]) {
            for (var j = 0; j < compteurIncr.item.length; j++) compteurIncr.item[j] = arrayAdditionTables(compteurIncr.item[j], donnee.item[j]);
            if (invenTools_etat) arrayAdditionTables(compteurIncr.ress_item_gain, gainBooster(donnee.item, localStorage.getObj(texte.script_invenTools + "_" + idPseudoJeu + "_" + universJeu + "_" + langue + "_proprietesPlanetes_production")));
        }
        return compteurIncr;
    }

    function incrementation_liste_position(coord) { // incrémente de 1 la position envoyée en argument
        // Si la position est déjà enregistrée ...
        for (var tmp = 0; tmp < liste_position.length; tmp++) {
            if (liste_position[tmp][0] == coord) {
                liste_position[tmp][1] += 1;
                return;
            }
        }
        // Si la position n'est pas encore enregistré on la rajoute puis on retrie le tableau par ordre de position ascendant
        liste_position.push([coord, 1]);
        arraySortPosition(liste_position);
    }

    function compteur_v22tableaux(type) { // Transformation des sommes en 5 tableaux prêts à l'affichage ; ajout de propriétés à l'objet 'compteurExpe'
        if (type == 0) { // partie supérieure des tableaux
            compteur_v2.rapport_resultat = new Array(new Array());
            compteur_v2.rapport_resultat[0] = [...compteur_v2.resultat];
            compteur_v2.rapport_resultat[0][11] = arraySomme(compteur_v2.resultat);
            compteur_v2.rapport_resultat[1] = arrayPercentage(compteur_v2.resultat, arraySomme(compteur_v2.resultat), config_user.nbDec);
            compteur_v2.rapport_resultat[1][11] = (compteur_v2.rapport_resultat[0][11] / jourActif()).arrondi_decimal(config_user.nbDec).ajoutSeparateurMilliers(config.separateurMilliers) + texte.parJour;

            compteur_v2.rapport_ressources = new Array(new Array());
            compteur_v2.rapport_ressources[0] = [...compteur_v2.ress_gain];
            compteur_v2.rapport_ressources[0][3] = compteur_v2.am_gain;

            compteur_v2.rapport_points = new Array(new Array(), new Array());
            compteur_v2.rapport_points[0][0] = ressource2point(arraySomme(compteur_v2.ress_gain));
            compteur_v2.rapport_points[0][1] = ressource2point(sumCoutListeVaisseau(compteur_v2.vaiss_gain) - sumCoutListeVaisseau(compteur_v2.vaiss_perte));
            compteur_v2.rapport_points[0][2] = compteur_v2.rapport_points[0][0] + compteur_v2.rapport_points[0][1];
            compteur_v2.rapport_points[1][0] = (100 * compteur_v2.rapport_points[0][0] / compteur_v2.rapport_points[0][2]).arrondi_decimal(config_user.nbDec);
            compteur_v2.rapport_points[1][1] = (100 * compteur_v2.rapport_points[0][1] / compteur_v2.rapport_points[0][2]).arrondi_decimal(config_user.nbDec);
            compteur_v2.rapport_points[1][2] = (compteur_v2.rapport_points[0][2] / jourActif()).arrondi_decimal(0).ajoutSeparateurMilliers(config.separateurMilliers) + texte.parJour;
        }
        if (type == 1) { // partie inférieure des tableaux
            compteur_v2.rapport_flotte = new Array(new Array(), new Array(), new Array());
            compteur_v2.rapport_flotte[0] = [...compteur_v2.vaiss_gain];
            compteur_v2.rapport_flotte[0][6] = compteur_v2.rapport_flotte[0][7] = compteur_v2.rapport_flotte[0][11] = compteur_v2.rapport_flotte[0][15] = ""; // VC+Rcy+EDLM effacés
            compteur_v2.rapport_flotte[0][15] = sumCoutListeVaisseau(compteur_v2.vaiss_gain);
            compteur_v2.rapport_flotte[1] = [...compteur_v2.vaiss_perte];
            compteur_v2.rapport_flotte[1][15] = sumCoutListeVaisseau(compteur_v2.vaiss_perte);
            var tableTmp = new Array();
            for (var tmp = 0; tmp < compteur_v2.vaiss_gain.length; tmp++) tableTmp[tmp] = compteur_v2.vaiss_gain[tmp] - compteur_v2.vaiss_perte[tmp]; // retrait du prototype soustractionTables après signalement d'un bug
            compteur_v2.rapport_flotte[2] = tableTmp;
            compteur_v2.rapport_flotte[2][15] = compteur_v2.rapport_flotte[0][15] - compteur_v2.rapport_flotte[1][15];

            compteur_v2.rapport_item = new Array(new Array(), new Array(), new Array());
            for (var tmp = 0; tmp < compteur_v2.item.length; tmp++)
                for (var tmp_2 = 0; tmp_2 < compteur_v2.item[tmp].length; tmp_2++) compteur_v2.rapport_item[tmp_2][tmp] = compteur_v2.item[tmp][tmp_2];
            compteur_v2.rapport_item[3] = compteur_v2.ress_item_gain;
            compteur_v2.rapport_item[3][3] = compteur_v2.rapport_item[3][4] = compteur_v2.rapport_item[3][5] = "";

            compteur_v2.rapport_divers = new Array(new Array(), new Array());
            var res = new Array();
            res = [...compteur_v2.resultat];
            var negNulPos = new Array(0, 0, 0);
            for (var tmp = 0; tmp < res.length; tmp++) negNulPos[param_resultat_negNulPos[tmp] + 1] += res[tmp];
            compteur_v2.rapport_divers[0] = negNulPos;
            compteur_v2.rapport_divers[1] = arrayPercentage(negNulPos, arraySomme(negNulPos), config_user.nbDec);
            compteur_v2.rapport_divers[0][3] = (compteur_v2.rapport_points[0][2] / arraySomme(compteur_v2.resultat)).arrondi_decimal(0).ajoutSeparateurMilliers(config.separateurMilliers) + texte.parExpe;
            compteur_v2.rapport_divers[1][3] = "";
            compteur_v2.rapport_divers[0][4] = zone_epuisee;
            compteur_v2.rapport_divers[1][4] = "";
        }
    }

    // *********************************
    // ****** Fonctions récupérer ******
    // *********************************

    function recuperer_etatCommandant() {
        var menu = document.getElementById("menuTable").getElementsByTagName("li");
        for (var i = 0; i < menu.length; i++)
            if (menu[i].getElementsByClassName("textlabel")[0].innerHTML == texte.menu_empire) return true;
        return false;
    }

    function recuperer_CSSOgame_width() {
        var styleTmp = document.getElementById("middle").currentStyle || window.getComputedStyle(document.getElementById("middle"), null); // récupéré sur http://javascript.developpez.com/faq/javascript/?page=CSS (FAQ JS) ; multi-naviguateur (d'où l'emploi du ||)
        return parseInt(styleTmp.width.replace(reg_nonNum, ""));
    }

    function recuperer_dateMax() { // renvoie la date format objet 'Date' actuelle-delai conservation messages
        var dateTmp = new Date();
        dateTmp.setTime(dateTmp.getTime() - (config.conservationMessages + config_user.conservationMessages_marge) * 86400000); // 86 400 000 étant le nombre de ms qu'il y a dans une journée
        return dateTmp;
    }

    function recuperer_info_round(rnd) {
        var table_rnd = rnd.getElementsByClassName("round_defender textCenter")[0].getElementsByClassName("newBack")[0].getElementsByTagName("table")[0];
        if (typeof table_rnd == "undefined") return -1;
        var i = 1;
        var vaiss_rnd = new Array();
        while (typeof table_rnd.getElementsByTagName("tr")[0].getElementsByTagName("th")[i] != "undefined") {
            vaiss_rnd[i - 1] = new Array(table_rnd.getElementsByTagName("tr")[0].getElementsByTagName("th")[i].innerHTML.toUpperCase(), table_rnd.getElementsByTagName("tr")[1].getElementsByTagName("td")[i].innerHTML);
            i++;
        }
        return vaiss_rnd;
    }

    function recuperer_infoCompte() { // renvoie une table de 4 cases (pseudo, uni, langue, idPseudoJeu)
        var varJeu = new Array();
        varJeu[0] = document.getElementsByName("ogame-player-name")[0].getAttribute("content");
        varJeu[1] = document.getElementsByName("ogame-universe")[0].getAttribute("content").split(".")[0].replace("uni", "");
        varJeu[2] = document.getElementsByName("ogame-language")[0].getAttribute("content");
        varJeu[3] = document.getElementsByName("ogame-player-id")[0].getAttribute("content");
        return varJeu;
    }

    // ******************************
    // ****** Autres fonctions ******
    // ******************************

    function gainBooster(item, prod) {
        var gainBoo = new Array(0, 0, 0);
        for (var i = 0; i <= 2; i++)
            for (var j = 0; j < item[i].length; j++) gainBoo[i] += item[i][j] * max_planete(prod, i) * 168 * ((j + 1) / 10); // formule 'inventaire tools' ; 168 heures = 7 jours
        return gainBoo;
    }

    function maintenance_supprMessage(id_mess) {
        for (var tmp = 0; tmp < liste_message_v2.length; tmp++) {
            if (liste_message_v2[tmp][0] == id_mess) {
                liste_message_v2.splice(tmp, 1);
                alert("message " + id_mess + " supprimé");
            }
        }
        localStorage.setObj(scriptKeyLocalStorage + "_liste_message_v2", liste_message_v2);
    }

    function verifier_MAJ(page) {
        return (page.getElementById("summary").getElementsByTagName("p")[1].innerHTML.replace(reg_nonVersion, "") == version_courante) ? false : true;
    }

    function message_sonde(donnee_texte) {
        if (donnee_texte.indexOf(mess_sonde_existe) == -1) return -1; // aucune sonde n'a été envoyée
        for (var i in mess_sonde) {
            for (var j in mess_sonde[i]) {
                if (donnee_texte.indexOf(mess_sonde[i][j]) != -1) return i;
            }
        }
        return 99; // la phrase affichée par la sonde n'est pas reconnue, code 99
    }

    function interpreter_boutonRadio(tableRadio) { // entrée: toutes les options d'une même question ; sortie: la réponse sélectionnée ou -1 si rien de selectionné
        for (var tmp = 0; tmp < tableRadio.length; tmp++)
            if (tableRadio[tmp].checked) return tableRadio[tmp].value;
        return -1;
    }

    function interpreter_boutonCheckbox(tableCheck) {
        var tableTmp = new Array();
        for (var tmp = 0; tmp < tableCheck.length; tmp++) tableTmp[tmp] = (tableCheck[tmp].checked) ? true : false;
        return tableTmp;
    }

    function purger_liste_message() {
        var dateMax = recuperer_dateMax();
        for (var i = 0; i < liste_message_v2.length; i++)
            if (dateFormatOgame2date(liste_message_v2[i][1]).getTime() < dateMax.getTime()) liste_message_v2.splice(i, 1);
        for (var i = 0; i < liste_message_RC.length; i++)
            if (dateFormatOgame2date(liste_message_RC[i].date).getTime() < dateMax.getTime()) liste_message_RC.splice(i, 1);
    }

    function sumCoutListeVaisseau(listeVaisseau) { // prixBase est une liste de prix (M,C,D)
        let totalRessource = 0;
        for (let i = 0; i < listeVaisseau.length; i++) {
            totalRessource += (vaisseau_cout[i][0] + vaisseau_cout[i][1] + vaisseau_cout[i][2]) * listeVaisseau[i];
        }
        return totalRessource;
    }

    async function parcours_message(messagesElementContainer, messageType) { // fonction 'colonne vertébrale'
        let promisesCRProcess = [];
        if (messageType === 'expedition') { // Soit page courante = 'Rapport d'expé'
            let messages = messagesElementContainer.querySelectorAll('li.msg');
            messages.forEach(message => {
                var mesg = new messageExpe(message);
                if (typeof mesg.resultat == "undefined") { // si aucun résultat n'est enregistré
                    affichage_alerte(texte.alerte_messageNonReconnu, message, "compteurExpe_alerteError", "nonReconnu");
                } else {
                    if (elementExiste(liste_message_v2, mesg.id, "[0]") == -1) {
                        incrementation_liste_position(mesg.coord);
                        compteur_v2 = incrementation_compteur_v2(compteur_v2, mesg); // migration v2: incrémentation du compteur
                        if ((mesg.resultat == "pirates") || (mesg.resultat == "aliens")) liste_message_RC[liste_message_RC.length] = new messageExpe_RC(mesg); // ajout à la liste d'un objet messageRC, jusqu'à qu'il en soit effacé
                        liste_message_v2[liste_message_v2.length] = new Array(mesg.id, mesg.date); // migration v2: ajout de la date et de l'identifiant dans la liste
                        var dateMax = recuperer_dateMax(); // si 'dateInit' est inférieure au délai de conservation des messages, on ne modifie plus 'dateInit'
                        if ((dateFormatOgame2date(dateInit).getTime() > dateMax.getTime()) && (dateFormatOgame2date(dateInit).getTime() > dateFormatOgame2date(mesg.date).getTime())) dateInit = mesg.date;
                        purger_liste_message();
                        if (mesg.mess_sonde == 1) { // zone épuisée
                            zone_epuisee++;
                            affichage_alerte(texte.alerte_posEpuisee, message, "compteurExpe_alerteAtt");
                        }
                        if (mesg.mess_sonde == 99) affichage_alerte(texte.alerte_messSondeNonReconnu, message, "compteurExpe_alerteError");
                        affichage_alerte(texte.alerte_rExpeAjoute, message, "compteurExpe_alerteOK");
                        if (mesg.resultat == "trouNoir") afficher_formRExp(message);
                    }
                }
            })
        // TODO : Fixer l'intégration des pertes sur les combats contre aliens & pirates
        } else if (messageType === 'combatReport') {
            let messages = messagesElementContainer.querySelectorAll('li.msg');
            for(let i = 0; i < messages.length; i++){
                let message = messages[i];
                let messageDate  = message.querySelector('.msg_date').textContent;
                let messageID = message.dataset.msgId;
                let isExpeditionCombatReport = message.querySelector('.msg_title').textContent.includes(':16]');
                let expeCorrespondante_v2 = liste_message_RC.findIndex(element => element.date === messageDate); // c'est l'index du message d'expédition lié au RC de l'expédition
                // SI le RC n'est pas sans combat (flotte descendue au 1er tour)
                if (isExpeditionCombatReport && expeCorrespondante_v2 != -1 && typeof liste_message_RC[expeCorrespondante_v2].ress_vaiss_perte == "undefined") {

                    let vaisseauIDToIndex= {
                        202: 0,
                        203: 1,
                        204: 2,
                        205: 3,
                        206: 4,
                        207: 5,
                        208: 6,
                        209: 7,
                        210: 8,
                        211: 9,
                        213: 10,
                        214: 11,
                        215: 12,
                        219: 13,
                        218: 14,
                    }
                    let perteVaisseau = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

                    let combatReport = await fetch('/game/index.php?page=messages&messageId='+messageID+'&tabid=21&ajax=1').then(data => data.text() ).then(data => {
                        return JSON.parse(data.match(/var combatData = jQuery.parseJSON\('(.+)'\);/)[1])
                    });
                    let combatRounds = combatReport.defenderJSON.combatRounds;
                    let lossesPerShipID = Object.values(combatRounds[combatRounds.length-1].losses)[0];
                    let lostShipsResources = 0;
                    for(let shipID in lossesPerShipID){
                        perteVaisseau[vaisseauIDToIndex[shipID]] += parseInt(lossesPerShipID[shipID]);
                    }
                    lostShipsResources = sumCoutListeVaisseau(perteVaisseau);

                    if (lostShipsResources == 0) { // si il n'y a pas de perte de vaisseaux
                        issue_combat[0]++;
                    } else{
                        issue_combat[1]++;
                        compteur_v2.vaiss_perte = arrayAdditionTables(compteur_v2.vaiss_perte, perteVaisseau); // Incrémentation du compteur
                    }
                    liste_message_RC.splice(expeCorrespondante_v2, 1); // On supprime le RC de la liste des RCs à traiter
                    affichage_alerte(texte.alerte_rcSimpleAjoute, message, "compteurExpe_alerteOK");
                }
            }
        } else if(messageType === 'harvest') {
            let messages = messagesElementContainer.querySelectorAll('li.msg');
            for(let i = 0; i < messages.length; i++){
                let message = messages[i];
                let messageID = message.dataset.msgId;
                let messageTitle = message.querySelector('.msg_title').textContent;
                if(messageTitle.includes('Rapport d`exploitation du champ de débris') && messageTitle.includes(':16]') && !list_harvest.includes(messageID)){
                    let rawResources = message.querySelector('.msg_content').textContent.match(/récolté ([\d\\.]+)\sunités de métal et ([\d\\.]+)\sunités de cristal/);
                    let resources = [parseInt(rawResources[1].replace(/\./g, '')), parseInt(rawResources[2].replace(/\./g, '')), 0];
                    compteur_v2.ress_gain = arrayAdditionTables(compteur_v2.ress_gain, resources);
                    compteur_v2.resultat[5]++;
                    list_harvest.push(messageID);
                    affichage_alerte(texte.alerte_rrAjoute, message, "compteurExpe_alerteOK");
                }
            }
        }
        savePeristentVariable();
    }

    function savePeristentVariable(){
        localStorage.setObj(scriptKeyLocalStorage + "_liste_message_v2", liste_message_v2);
        localStorage.setObj(scriptKeyLocalStorage + "_compteur", compteur_v2);
        localStorage.setObj(scriptKeyLocalStorage + "_liste_message_RC", liste_message_RC);
        localStorage.setObj(scriptKeyLocalStorage + "_list_harvest", list_harvest);
        localStorage.setObj(scriptKeyLocalStorage + "_dateInit", dateInit);
        localStorage.setObj(scriptKeyLocalStorage + "_liste_position", liste_position);
        localStorage.setObj(scriptKeyLocalStorage + "_issue_combat", issue_combat);
        localStorage.setObj(scriptKeyLocalStorage + "_zone_epuisee", zone_epuisee);
    }

    function modifier_config(option_table) { // array option_table(nbDec, delaiActualisation, spoilerDefault, conservationMessages_marge, itemVisible, uniteRaccourci, option_BBCode_perso_place, option_BBCode_titre, option_BBCode_perso)
        if (option_table[0]) config_user.nbDec = option_table[0];
        if (option_table[1]) config_user.delaiActualisation = option_table[1];
        if (option_table[2]) config_user.spoilerDefault = (option_table[2] == "true"); // pour convertir le texte "true"/"false" renvoyé par le code HTML 'input'
        if (option_table[3]) config_user.conservationMessages_marge = parseInt(option_table[3]);
        if (option_table[4]) config_user.itemVisible = (option_table[4] == "true"); // pour convertir le texte "true"/"false" renvoyé par le code HTML 'input'
        if (option_table[5]) config_user.uniteRaccourci = (option_table[5] == "true"); // pour convertir le texte "true"/"false" renvoyé par le code HTML 'input'
        if (option_table[6]) config_user.uniteRaccourci_seuil = option_table[6];

        if (option_table[7]) {
            config_user.option_BBCode_titre_pseudo = option_table[7][0];
            config_user.option_BBCode_titre_uni = option_table[7][1];
            config_user.option_BBCode_titre_langue = option_table[7][2];
        }
        if (option_table[8]) config_user.option_BBCode_perso_place = option_table[8];
        if (option_table[9]) config_user.option_BBCode_perso = option_table[9];

        localStorage.setObj(scriptKeyLocalStorage + "_config_user", config_user);
        modifierConsole(config.alerteOK_bgColor, texte.console_optionInit);
    }

    function default_config() {
        var config_user = { // configuration par défaut installée, modifiable IG par l'utilisateur ensuite
            nbDec: 2, // le nombre de décimal affichées lors des arrondis
            delaiActualisation: 1000,
            spoilerDefault: true, // bas des tables + graph
            conservationMessages_marge: 1,
            option_BBCode_titre_pseudo: true,
            option_BBCode_titre_uni: true,
            option_BBCode_titre_langue: true,
            option_BBCode_perso_place: "mas",
            option_BBCode_perso: "Texte personnalisé",
            itemVisible: true,
            uniteRaccourci: true,
            uniteRaccourci_seuil: "m",
        };
        localStorage.setObj(scriptKeyLocalStorage + "_config_user", config_user);
        localStorage.setObj(scriptKeyLocalStorage + "_versionCourante", version_courante);
        modifierConsole(config.alerteOK_bgColor, texte.console_optionFin);
    }

    function initialiserDonneesUtilisateur() { // initialise les données utilisateur du script
        modifierConsole(config.alerteError_bgColor, texte.console_installDebut); // si l'installation se fait automatiquement, sans passer par le bouto 'install', on affiche le message console de cette manière
        localStorage.setObj(scriptKeyLocalStorage + "_liste_message_v2", new Array());
        localStorage.setObj(scriptKeyLocalStorage + "_dateInit", date2dateFormatOgame(new Date()));
        localStorage.setObj(scriptKeyLocalStorage + "_compteur", new compteurExpe(new Array()));
        localStorage.setObj(scriptKeyLocalStorage + "_liste_message_RC", new Array());
        localStorage.setObj(scriptKeyLocalStorage + "_list_harvest", new Array());
        localStorage.setObj(scriptKeyLocalStorage + "_versionCourante", version_courante);
        localStorage.setObj(scriptKeyLocalStorage + "_liste_position", new Array());
        localStorage.setObj(scriptKeyLocalStorage + "_issue_combat", new Array(0, 0));
        localStorage.setObj(scriptKeyLocalStorage + "_zone_epuisee", 0);
        localStorage.setObj(scriptKeyLocalStorage + "_premiereExecution", false);
        default_config(); // initialise les options config_user à leurs valeurs par défaut
        modifierConsole(config.alerteOK_bgColor, texte.console_installFin);
    }

    // ***********************
    // ****** Variables ******
    // ***********************

    var reg_nonNum = new RegExp("[^0-9]", "g");
    var reg_nonVersion = new RegExp('[<>Version:"/b \n]', 'g');
    var pseudoJeu, universJeu, langue, idPseudoJeu;

    // Définition des constantes du jeu
    var varJeu = recuperer_infoCompte();
    pseudoJeu = varJeu[0];
    universJeu = varJeu[1];
    langue = varJeu[2];
    idPseudoJeu = varJeu[3];
    let scriptID = 'CompteurExpe';
    let scriptKeyLocalStorage = scriptID;

    if (langue == "fr") {
        var vaisseau = new Array(
            new Array("Petit transporteur", "P.TRANSP."),
            new Array("Grand transporteur", "G.TRANSP."),
            new Array("Chasseur léger", "CH.LÉGER"),
            new Array("Chasseur lourd", "CH.LOURD"),
            new Array("Croiseur", "CROISEUR"),
            new Array("Vaisseau de bataille", "V.BATAILLE"),
            new Array("Vaisseau de colonisation", "V.COLO"),
            new Array("Recycleur", "RECYCLEUR"),
            new Array("Sonde d`espionnage", "SONDE"),
            new Array("Bombardier", "BOMBARDIER"),
            new Array("Destructeur", "DESTR."),
            new Array("Etoile de la mort", "RIP"),
            new Array("Traqueur", "TRAQUEUR"),
            new Array('Éclaireur', 'ECLAIREUR'),
            new Array('Faucheur', 'FAUCHEUR')
        );

        var param_resultat = new Array( // phrases des messages d'expéditions ; la première case de chaque type de résultat est réservée à la nomination du résultat ;  la 2ème à la nomination telle qu'elle sera affichée" ; la 3ème à la couleur d'affichage dans le graphique
            new Array("aucun", "Aucun", "votre flotte fera demi-tour", "sans résultat aucun", "l`expédition a dû être interrompue", "ne ramène rien de spécial", "a découvert... le vide", "C`est d`ailleurs la seule info recueillie", "aucune information vraiment passionnante", "aucun résultat intéressant", "plusieurs musées de la planète-mère", "revient les mains et les soutes vides", "Peut-être saurons nous", "revient donc sans aucun résultat", "ne nous a pas apporté grand chose", "a contracté une espèce de paludisme qui a envoyé une bonne partie de l`équipage à l`infirmerie"),
            new Array("pirates", "Pirates", "pirates", "Des barbares primitifs"),
            new Array("aliens", "Aliens", "espèce inconnue", "petit groupe de vaisseaux inconnus", "sans avertissement et sans raison", "les agresseurs n'ont pas pu être identifiés", "les agresseurs n`ont pas pu être identifiés", "vaisseaux cristallins va entrer en collision", "faisons feu"),
            new Array("avance", "Avance", "avec un peu d`avance", "pour accélérer son retour"),
            new Array("retard", "Retard", "retard", "plus longtemps qu`initialement prévu", "fallu plus de temps"),
            new Array("ress_gain", "Ressources", "L`attaquant obtient Métal", "L`attaquant obtient Cristal", "L`attaquant obtient Deutérium"),
            new Array("vaiss_gain", "Flotte trouvée", "Votre flotte s`est agrandie", "si nous pouvons sauver quelques vaisseaux", "découvert une forteresse stellaire"),
            new Array("marchand", "Marchand", "chargé de ressources à échanger", "liste de clients privilégiés"),
            new Array("am", "Anti-matière", "L`attaquant obtient Antimatière", "unités de Antimatière"),
            new Array("trouNoir", "Trou noir", "krrzrzzzt Cela zrrrtrzt ressemble", "un trou noir en cours de formation", "détruisant toute l`expédition", "la flotte semble perdue"),
            new Array("item", "Item", "précieux artefact", "y a trouvé un objet", "Elle a laissé un objet")
        );

        var ressource = new Array("Métal", "Cristal", "Deutérium");
        var mess_sonde_existe = "Extrait du journal de bord d`un officier de communication"; // phrase devant être trouvée pour qu'une recherche d'alerte épuisement soit lancée
        var mess_sonde = new Array(
            new Array("personne ne soit jamais venu", "jamais été explorée", "se savoir le premier à explorer"),
            new Array("découvert de très vieilles traces", "Nous percevons des signaux d'autres expéditions", "la présence d`autres flottes", "nous joindre aux autres expéditions", "installer des feux de signalisation", "plus judicieux d'installer une stèle", "collision avec une autre flotte d`expédition", "contact radio amical avec d`autres flottes", "autre flotte d`expédition qui se trouvait dans le même")
        );

        var item_nom = new Array("Booster de métal", "Booster de cristal", "Booster de deutérium", "DETROID", "KRAKEN", "NEWTRON");
        var item_niv = new Array("bronze", "argent", "or");
        var item_nom_texte = new Array("Booster de métal", "Booster de cristal", "Booster de deutérium", "Detroïd", "Kraken", "Newtron");
        var item_niv_texte = new Array("Bronze", "Argent", "Or");

        var texte = {
            script: "CompteurExpe",
            script_texte: "Compteur expédition 3000",
            script_invenTools: "Inventaire tools",
            version: "version",
            graphGoogle_titre: "Résultats des expéditions",

            rapport_expe: "Résultat de l`expédition",
            rapport_combat: "Rapport de combat",
            unites: "unités",
            am: "(AM)",
            RC_contactPerdu: "Nous avons perdu le contact",
            antiMatiere: "Anti-matière",
            parJour: "/j",
            parExpe: "/expé",
            menu_empire: "Empire",

            alerte_rExpeAjoute: "Rapport d'expédition ajouté",
            alerte_rcSimpleAjoute: "RC ajouté",
            alerte_rrAjoute: "RR ajouté à expe-3000",
            alerte_rcDetailleAjoute: "RC détaillé ajouté",
            alerte_nonSauve: "A sauvegarder",
            alerte_messageNonReconnu: "Message d'expédition non reconnu !",
            alerte_messSondeNonReconnu: "Rapport communication non reconnu !",
            alerte_rcDetailleInutile: "Aucune perte alliée: Détails inutiles",
            alerte_posEpuisee: "Position épuisée !",
            alerte_trouNoirParam: "Trou noir paramétré !",

            confirm_Install: "Voulez-vous installer le script ?\nATTENTION ! Cette opération effacera toutes les données d'expédition enregistrées !",
            confirm_Install_2: "Opération IRREVERSIBLE ! (au cas où :-))\nEn cas d'hésitation, cliquer 'annuler' et consulter la doc ou le forum",
            confirm_default: "Voulez-vous remettre les valeurs de configuration (pas les données des messages !), par défaut du script ?",

            boutonSpoiler_title: "Afficher/Masquer le bas de la table",
            boutonInstall_title: "(re-)initialiser le script (données + config)",
            boutonUserScripts_title: "Test version à jour - Page UserScripts",
            boutonForum_title: "Page forum officiel ogame - Documentation, discussion",
            boutonOption_title: "Afficher les options du script",
            boutonDefault_title: "Rétablir valeurs de config par defaut",
            boutonMAJ_title: "Mettre le script à jour",
            boutonBBCode_title: "BBCode",
            boutonValider: "Sauver config",
            boutonValider_BBCode: "Sauver config BBCode",
            boutonValider_trouNoir: "Enregistrer",

            console_base: ">",
            console_installDebut: "Début de l'installation...",
            console_installAnnulee: "Installation annulée !",
            console_installFin: "Script installé !",
            console_optionDebut: "Début de configuration...",
            console_optionAnnulee: "Configuration annulée !",
            console_optionFin: "Configuration modifiée",
            console_optionInit: "Config modifiée !",

            option_nbDec: "Décimales %",
            option_delaiActualisation: "Fréquence d'exécution du script page 'messages' (ms)",
            option_spoilerDefault: "Affichage table flotte+graphique par défaut",
            option_spoilerDefault_aff: "Afficher",
            option_spoilerDefault_mas: "Masquer",
            option_itemVisible: "Affichage table items",
            option_itemVisible_aff: "Afficher",
            option_itemVisible_mas: "Masquer",
            option_conservationMessages_marge: "Marge conservation des messages (j)",
            option_default: "Remettre les valeurs par défaut",
            option_uniteRaccourci: "Affichage des grands nombres",
            option_uniteRaccourci_complet: "Complet",
            option_uniteRaccourci_racc: "Raccourci (k/M/G)",
            option_uniteRaccourci_seuil: "|__ Quantité minimum",
            option_uniteRaccourci_seuil_k: "k",
            option_uniteRaccourci_seuil_m: "M",
            option_uniteRaccourci_seuil_g: "G",

            option_BBCode: "Export BBCode / Texte à copier-coller dans un forum ou autre interpréteur de BBCode",
            option_BBCode_perso: "Ce texte personnalisé s'affichera dans le BBCode",
            option_BBCode_titre: "Montrer dans le titre:",
            option_BBCode_titre_pseudo: "Pseudo:",
            option_BBCode_titre_uni: "Univers:",
            option_BBCode_titre_langue: "Langue:",
            option_BBCode_perso_place: "Emplacement du texte:",
            option_BBCode_perso_place_haut: "Haut",
            option_BBCode_perso_place_bas: "Bas",
            option_BBCode_perso_place_mas: "Masquer",

            trouNoir: "Trou noir !! :(<br><br>Connaissez-vous la composition exacte de la flotte perdue ?<br>Si oui, veuillez la saisir<br>on, laissez vide et validez, ou bien quittez:",

            liste_position_expedition: "expédition",
            liste_position_nonRep: "non listée",

            issue_combat_combat: "combat",
            issue_combat_0perte: "sans perte alliée",
            issue_combat_perte: "avec dégâts",
            issue_combat_total: "au total",
            issue_combat_nonRep: "non listé",

            titre_h1_rapport: ">> EXPÉ-3000 <<",
            titre_h1_sousTitre: "Compteur démarré le: ",
            titre_h2_resultat: "RÉSULTAT",
            titre_h2_ressources: "RESSOURCES OBTENUES",
            titre_h2_points: "POINTS",
            titre_h2_flotte: "FLOTTE",
            titre_h2_item: "ITEMS",
            titre_h2_divers: "AUTRES STATISTIQUES",
            titre_h3_resultat_resultat: "Résultat",
            titre_h3_resultat_nombre: "Nombre",
            titre_h3_resultat_pourct: "%",
            titre_h3_ressources_ressource: "Ressource",
            titre_h3_ressources_quantite: "Quantité",
            titre_h3_points_domaine: "Domaine",
            titre_h3_points_points: "Points",
            titre_h3_points_pourct: "%",
            titre_h3_flotte_vaisseau: "Vaisseau",
            titre_h3_flotte_gain: "Gain",
            titre_h3_flotte_perte: "Perte",
            titre_h3_flotte_solde: "Solde",
            titre_h3_item_nom: "Nom de l'item",
            titre_h3_item_gain: "Gain",
            titre_h3_divers_nom: "Statistique",
            titre_h3_divers_nombre: "Nombre",
            titre_h3_divers_pourct: "%",
            titre_hLigne_resultat_total: "Total",
            titre_hLigne_flotte_ressources: "Ressources",
            titre_hLigne_flotte_trouNoir: "Trou noir",
            titre_hLigne_points_ressources: "Ressources",
            titre_hLigne_points_flotte: "Flotte",
            titre_hLigne_points_total: "Total",
            titre_hLigne_divers_resNeg: "Résultat négatif",
            titre_hLigne_divers_resNul: "Résultat nul",
            titre_hLigne_divers_resPos: "Résultat positif",
            titre_hLigne_divers_ptExp: "Moyenne de points",
            titre_hLigne_divers_zoneEpuisee: "Zone épuisée",
        };
    }
    var param_resultat_color = new Array("0033FF", "9999CC", "FF0000", "33CCFF", "66FF66", "FF99CC", "FFFF00", "990066", "FF8000", "CCCCCC", "FF99CC"); // couleurs du graphique chaque cellule représente un résultat d'expé, dans l'ordre classique du script
    var param_resultat_negNulPos = new Array(0, -1, -1, 1, -1, 1, 1, 1, 1, -1, 1); // -1: resultat négatif ; 0: résultat neutre ; +1: résultat positif
    var vaisseau_cout = new Array(
        new Array(2000, 2000, 0),
        new Array(6000, 6000, 0),
        new Array(3000, 1000, 0),
        new Array(6000, 4000, 0),
        new Array(20000, 7000, 2000),
        new Array(45000, 15000, 0),
        new Array(10000, 20000, 10000),
        new Array(10000, 6000, 2000),
        new Array(0, 1000, 0),
        new Array(50000, 25000, 15000),
        new Array(60000, 50000, 15000),
        new Array(5000000, 4000000, 1000000),
        new Array(30000, 40000, 15000),
        new Array(8000, 15000, 8000),
        new Array(85000, 55000, 20000)); // coûts de chaque vaisseau

    var config = {
        header1_fontColor: "#FFFFFF",
        header1_fontSize: 18,
        header1_fontBold: "bold",
        header1_bgColor: "#003366",
        header1_textType: "Arial black",
        header1_textAlign: "center",

        header2_fontColor: "#FFFF00",
        header2_fontSize: 12,
        header2_fontBold: "bold",
        header2_bgColor: "#00002D",

        headerLigne_fontColor: "#FF8000",
        headerLigne_fontSize: 9,
        headerLigne_fontBold: "bold",
        headerLigne_bgColor: "#000000",
        headerLigne_textAlign: "left",

        valeur_fontColor: "#FFFFFF",
        valeur_fontSize: 9,
        valeur_fontBold: "normal",
        valeur_bgColor: "#000000",

        valeurBis_bgColor: "#070707",

        valeurTotal_fontColor: "#FF0000",
        valeurTotal_fontSize: 9,
        valeurTotal_fontBold: "bold",
        valeurTotal_bgColor: "#111111",

        alerte_fontColor: "#FFFFFF",
        alerte_fontSize: 9,
        alerte_fontBold: "bold",
        alerte_textAlign: "center",

        alerteOK_bgColor: "#009900",
        alerteAtt_bgColor: "#FF6600",
        alerteError_bgColor: "#D90000",

        console_fontColor: "#FFFFFF",
        console_fontSize: 11,
        console_fontBold: "bold",
        console_bgColor: "#000000",
        console_textType: "Courier",
        console_textAlign: "left",
        console_width: 30, // Valeur en % de la largeur totale

        dateInit_fontColor: "#FFFFFF",
        dateInit_fontSize: 11,
        dateInit_fontBold: "normal",
        dateInit_bgColor: "#003366",
        dateInit_textAlign: "left",

        option_fontColor: "#FFFFFF",
        option_fontSize: 12,
        option_fontBold: "bold",
        option_hauteurLigne: 28,

        BBCode_separation_fontColor: "#666666",
        BBCode_separateur: " - -||- - ",
        BBCode_header_fontSize: 14,
        BBCode_intro_fontSize: 14,
        BBCode_valeur_fontSize: 10,
        BBCode_conclu_fontSize: 9,

        graph_img_h: 200,
        graph_img_w: 330,
        graph_txt_w: 200,
        option_BBCode_textArea_h: 8,
        option_BBCode_textArea_w: 122,
        option_BBCode_textArea_perso_h: 2,
        separateurMilliers: " ",

        boutonSpoiler_url: "https://gf1.geo.gfsrv.net/cdn0b/d55059f8c9bab5ebf9e8a3563f26d1.gif",
        boutonInstall_url: "http://img28.imageshack.us/img28/2411/boutoninstall3.png",
        boutonUserScripts_url: "http://img203.imageshack.us/img203/3286/boutonuserscripts.png",
        boutonForum_url: "http://img138.imageshack.us/img138/3918/boutonforum.png",
        boutonOption_url: "http://img820.imageshack.us/img820/5325/boutonoption.png",
        boutonDefault_url: "http://img820.imageshack.us/img820/8092/boutondefault.png",
        boutonMAJ_url: "http://img266.imageshack.us/img266/3448/boutonmaj.png",
        boutonBBCode_url: "http://imageshack.us/a/img821/7079/boutonbbcode.png",
        boutonUserScripts_lien: "http://userscripts.org/scripts/show/150500",
        boutonForum_lien: "http://board.ogame.fr/board1474-ogame-le-jeu/board641-les-cr-ations-ogamiennes/board642-logiciels-tableurs/1061937-exp-3000-compteur-d-exp-dition-autonome/",
        boutonMAJ_lien: "https://github.com/ouraios/ogame-scripts/raw/master/expe-3000/expe-3000.user.js",
        bouton_width: 27,
    };
    // ********************
    // ****** Script ******
    // ********************


    // test si 1ère exécution / MAJ <v2 / MAJ <  var version_courante / MAJ
    var ordonnerListePosition = false; // passera a true si il y a besoin d'ordonner la liste (au changement de version)
    let checkCurrentVersion = localStorage.getObj(scriptKeyLocalStorage + "_versionCourante");
    if (location.href != "https://github.com/ouraios/ogame-scripts/raw/master/expe-3000/expe-3000.user.js") {

        if (localStorage.getObj(scriptKeyLocalStorage + "_premiereExecution") != false){
            initialiserDonneesUtilisateur();
        } else {
            if (checkCurrentVersion && checkCurrentVersion != version_courante) {
                patch();
                localStorage.setObj(scriptKeyLocalStorage + "_versionCourante", version_courante);
            }
        }
    }
    creer_CSS();

    if (location.href == "https://github.com/ouraios/ogame-scripts/raw/master/expe-3000/expe-3000.user.js") {
        (verifier_MAJ(document)) ? affichage_alerte("Mise-à-jour disponible", document.getElementById("summary"), "compteurExpe_alerteAtt") : affichage_alerte("Script à jour", document.getElementById("summary"), "compteurExpe_alerteOK");
    }

    var url = location.href.split("page=")[1].split("&")[0].split("#")[0];
    config.conservationMessages = ((url != "combatreport") && (recuperer_etatCommandant())) ? 7 : 1; // Si le commandant est activé ou non, le délai de conservation des messages est fixé à 1 ou 7 jours
    var mess_pageCourante = -1; // Variable temporaire qui donne la page message actuellement visitée (en fournissant l'id du premier message) ; grâce à cette variable on sait si la page est changée (hors actualisation)
    var invenTools_etat = (localStorage.getObj(texte.script_invenTools + "_" + idPseudoJeu + "_" + universJeu + "_" + langue + "_proprietesPlanetes_production") == null) ? false : true;

    if (localStorage.getObj(scriptKeyLocalStorage + "_liste_position") == null) localStorage.setObj(scriptKeyLocalStorage + "_liste_position", new Array()); // MAJ v3.6
    if (localStorage.getObj(scriptKeyLocalStorage + "_issue_combat") == null) localStorage.setObj(scriptKeyLocalStorage + "_issue_combat", new Array(0, 0)); // MAJ v3.9
    if (localStorage.getObj(scriptKeyLocalStorage + "_zone_epuisee") == null) localStorage.setObj(scriptKeyLocalStorage + "_zone_epuisee", 0); // MAJ v3.9

    var compteur_v2 = localStorage.getObj(scriptKeyLocalStorage + "_compteur");
    var liste_message_RC = localStorage.getObj(scriptKeyLocalStorage + "_liste_message_RC");
    var liste_message_v2 = localStorage.getObj(scriptKeyLocalStorage + "_liste_message_v2");
    var list_harvest = localStorage.getObj(scriptKeyLocalStorage + "_list_harvest");
    var dateInit = localStorage.getObj(scriptKeyLocalStorage + "_dateInit");
    var config_user = localStorage.getObj(scriptKeyLocalStorage + "_config_user");
    var liste_position = localStorage.getObj(scriptKeyLocalStorage + "_liste_position");
    var issue_combat = localStorage.getObj(scriptKeyLocalStorage + "_issue_combat");
    var zone_epuisee = localStorage.getObj(scriptKeyLocalStorage + "_zone_epuisee");

    if (ordonnerListePosition) liste_position = arraySortPosition(liste_position); // la table_position est réordonnée en cas de changement de version (MAJ v3.9)
    if (compteur_v2.resultat.length == 10) compteur_v2.resultat[10] = 0; // MAJ v3.5
    if (typeof compteur_v2.item == "undefined") compteur_v2.item = new Array(new Array(0, 0, 0), new Array(0, 0, 0), new Array(0, 0, 0), new Array(0, 0, 0), new Array(0, 0, 0), new Array(0, 0, 0)); // MAJ v3.5
    if (typeof compteur_v2.ress_item_gain == "undefined") { // MAJ v6: attribut 'ress_item_gain' est crée ET on le remplit de la production des boosters (nécessite 'inventaire tools': les valeurs des boosters ne s'actualisent qu'une seule fois (à la MAJ du script), par la suite, elles s'ajouteront à un array (M,C,D) au moment de l'acquisition du booster seulement
        compteur_v2.ress_item_gain = new Array(0, 0, 0);
        if (invenTools_etat) compteur_v2.ress_item_gain = gainBooster(compteur_v2.item, localStorage.getObj(texte.script_invenTools + "_" + idPseudoJeu + "_" + universJeu + "_" + langue + "_proprietesPlanetes_production"));
    }
    localStorage.setObj(scriptKeyLocalStorage + "_compteur", compteur_v2); // ré-enregistrement après MAJ

    // maintenance_supprMessage("235871519"); // appel à une fonction de maintenance: suppression d'un message de la liste par son id

    if (document.URL.match(/component=overview/)) afficherTable();
    if (document.URL.match(/page=messages/)) {
        setTimeout(() => {
            const observerConfig = {attributes: true, childList: true, subtree: true};

            const combatReportTabId = document.querySelector('li[data-tabid="21"]').getAttribute('aria-labelledby');
            const combatReportTab = document.querySelector(`div[aria-labelledby="${combatReportTabId}"`)
            const combatReportObserver = new MutationObserver((mutationsList, observer) => {
                for (let mutation of mutationsList) {
                    if (mutation.type === 'childList' && mutation.target.id === 'fleetsgenericpage') {
                        parcours_message(mutation.target, 'combatReport');
                    }
                }
            });
            combatReportObserver.observe(combatReportTab, observerConfig);

            const expeditionTabId = document.querySelector('li[data-tabid="22"]').getAttribute('aria-labelledby');
            const expeditionTab = document.querySelector(`div[aria-labelledby="${expeditionTabId}"`)
            const expeditionObserver = new MutationObserver((mutationsList, observer) => {
                for (let mutation of mutationsList) {
                    if (mutation.type === 'childList' && mutation.target.classList.contains('ui-tabs-panel')) {
                        parcours_message(mutation.target, 'expedition');
                    }
                }
            });
            expeditionObserver.observe(expeditionTab, observerConfig);


            const harvestTabId = document.querySelector('li[data-tabid="24"]').getAttribute('aria-labelledby');
            const harvestTab = document.querySelector(`div[aria-labelledby="${harvestTabId}"`)
            const harvestObserver = new MutationObserver((mutationsList, observer) => {
                for (let mutation of mutationsList) {
                    if (mutation.type === 'childList' && mutation.target.classList.contains('ui-tabs-panel')) {
                        console.log('YES');
                        parcours_message(mutation.target, 'harvest');
                    }
                }
            });
            harvestObserver.observe(harvestTab, observerConfig);


        }, 1000)
    }
})();
