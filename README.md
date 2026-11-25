# Szkic opisu projektu

> **Status:** dokument roboczy zebrany z koncepcji i rozmowy. Opisuje kierunek produktu, nie ostateczną specyfikację ani zatwierdzoną implementację. Elementy oznaczone jako propozycje lub pytania wymagają decyzji.

## 1. Cel i wizja produktu

Projekt ma umożliwić osobom bez umiejętności technicznych tworzenie i publikowanie statycznych stron internetowych w rozmowie z agentem AI. Użytkownik opisuje swoje potrzeby zwykłym językiem, odpowiada na pytania, ogląda stronę w przeglądarce i wskazuje, co chce zmienić. Nie musi oglądać ani edytować kodu, plików, terminala, konfiguracji QEMU ani narzędzi publikacyjnych.

Docelowy przepływ użytkownika:

1. Pobierz, rozpakuj i uruchom aplikację.
2. Wybierz język interfejsu i podaj klucz OpenAI API.
3. Aplikacja uruchamia przygotowane środowisko QEMU.
4. Użytkownik widzi stronę w podglądzie i rozmawia z agentem o jej wyglądzie oraz treści.
5. Agent wykonuje zmiany, buduje stronę i sprawdza ją w przeglądarce.
6. Użytkownik przegląda efekt, historię zmian i w razie potrzeby cofa zmianę albo tworzy odgałęzienie.
7. Po zaakceptowaniu strony użytkownik prosi o publikację; aplikacja hosta publikuje zatwierdzony wynik.

Podstawowym zakresem produktu jest **tworzenie statycznych witryn**. Nie zakłada się, że użytkownik ma znać frameworki, HTML, CSS, JavaScript, Git, FTP, SSH czy QEMU.

Model BYOK (użytkownik podaje własny klucz API) ma być tani w użyciu, ale rozmowa nie ustaliła docelowego kosztu ani limitów. Nie należy utożsamiać klucza API z subskrypcją ChatGPT: rozliczenie API jest oddzielne. Koszty modeli i ewentualnego generowania obrazów, sposób ich prezentowania oraz limity wymagają decyzji i analizy.

## 2. Użytkownicy i doświadczenie

### Użytkownik docelowy

Osoba, która potrafi opisać, jaką stronę chce mieć, ale nie chce samodzielnie programować ani zarządzać plikami projektu. Może dostarczyć teksty, zdjęcia i inne materiały ze swojego komputera.

### Zasady interfejsu

- Interfejs koncentruje się na rozmowie i aktualnym podglądzie witryny.
- Użytkownik może podawać agentowi prompty głosowo, zamiast wpisywać je na klawiaturze.
- Kod, struktura katalogów, logi techniczne i terminal nie są widoczne w zwykłym przepływie użytkownika.
- Agent rozmawia o potrzebach, treści, odbiorcach, stylu i wyglądzie strony, a nie o szczegółach implementacyjnych.
- Agent zadaje pytania, gdy potrzebuje decyzji użytkownika. Aplikacja może prezentować je jako tekst, wybór spośród opcji, próbki obrazów, selektor kolorów, wybór stylu lub pola do uzupełnienia treści.
- Użytkownik może wykonać zrzut ekranu podglądu, rysować na nim, wskazać element i dodać komentarz — tekstowy lub umieszczony na obrazie — bez znajomości nazw elementów HTML.
- Użytkownik może wskazać tekst na stronie podglądu, przełączyć go w tryb edycji i ręcznie wprowadzić poprawkę, a następnie wysłać ją agentowi do zastosowania w projekcie.
- Postęp, błędy istotne dla użytkownika, zmiany i wynik sprawdzania strony są przedstawiane prostym językiem.
- Gdy agent dokona zmiany, użytkownik może zobaczyć nowy podgląd, sprawdzić listę zmian, cofnąć zmianę lub utworzyć odgałęzienie.

## 3. Architektura wysokiego poziomu

### Aplikacja hosta

Aplikacja desktopowa oparta na Electronie zapewnia GUI użytkownika i zarządza cyklem życia środowiska gościa. Jej obowiązki obejmują:

- uruchamianie, monitorowanie i zatrzymywanie QEMU;
- wyświetlanie interfejsu rozmowy, historii zmian, pytań agenta i podglądu strony;
- wybór języka oraz wprowadzenie i bezpieczne przechowywanie danych uwierzytelniających;
- import wybranych przez użytkownika plików, np. obrazów, do projektu w VM;
- import i eksport przenośnego pakietu projektu;
- przekazywanie zatwierdzonych wyników z VM do mechanizmu publikacji;
- publikację strony przy użyciu narzędzi i poświadczeń dostępnych po stronie hosta.

Interfejs strony i usług pomocniczych gościa ma być dostępny lokalnie przez port przekazany przez QEMU. Usługi przeznaczone dla hosta powinny być osiągalne wyłącznie z hosta, a nie z sieci lokalnej lub Internetu.

Samo nasłuchiwanie na `localhost` wewnątrz VM nie zapewnia dostępu przez `localhost` hosta. Przekierowanie lub pośredniczenie w ruchu musi być jawnie zaprojektowane i zweryfikowane; konfiguracja nie może wystawiać usług do sieci. Szczegóły zależą od QEMU, systemu hosta i wybranego trybu sieciowego.

### Maszyna gościa

QEMU uruchamia obraz Linuxa z narzędziami wymaganymi do pracy agenta i budowania strony. Wstępnym kandydatem jest typ maszyny **QEMU `microvm`**: ograniczony model urządzeń, przeznaczony do lekkich i szybko uruchamianych maszyn. To nadal maszyna wirtualna z własnym systemem, nie kontener. `microvm` ma ograniczenia sprzętowe i wymaga odpowiednio przygotowanego jądra/initramfs oraz obsługi urządzeń `virtio-mmio`.

Wstępna rekomendacja dla systemu gościa to **minimalny Debian 13**. Playwright oficjalnie wspiera Debian 12/13, a jego narzędzia instalacyjne mogą pobrać zależności przeglądarki. Alpine jest mniejszy, ale nie jest wymieniony jako wspierany system Playwright; dlatego nie jest domyślnym wyborem dla pierwszej wersji.

W VM znajdują się:

- projekt witryny i jego system budowania;
- agent oparty na OpenAI Agents SDK;
- narzędzia do pracy z plikami i terminalem;
- Node.js i zależności wymagane do budowania oraz uruchamiania podglądu;
- headless Chromium i Playwright MCP do kontroli witryny;
- narzędzie lub integracja do generowania obrazów;
- czcionki i narzędzia potrzebne do pracy z witryną;
- dostęp do Internetu w zakresie potrzebnym do pracy agenta i pobierania zasobów.

Obraz VM powinien być przygotowany wcześniej, aby użytkownik nie musiał instalować Linuksa, Node.js, Playwrighta ani zależności przeglądarki. Wersje Node.js, Playwright MCP i przeglądarki powinny być przypięte i testowane razem, a nie instalowane z nieprzewidywalnym `latest` przy każdym starcie.

### Agent i warstwa narzędzi

Wstępnie wybranym środowiskiem agenta jest **OpenAI Agents SDK**. Zapewnia pętlę agenta, narzędzia funkcyjne, integrację MCP, stan sesji i mechanizmy interakcji z użytkownikiem, bez konieczności korzystania z gotowego interfejsu OpenHands. Własna aplikacja może udostępniać agentowi kontrolowane narzędzia i wystawiać warstwę API na potrzeby GUI.

Nie ma jednego powszechnego API, które standaryzowałoby komunikację dowolnego klienta z dowolnym agentem. MCP służy do łączenia agenta z narzędziami, a nie do definiowania API samego agenta. ACP (Agent Client Protocol) dotyczy komunikacji klient–agent, ale nie został wybrany dla tej architektury. OpenAI Agents SDK jest biblioteką, nie gotowym serwerem REST; aplikacja będzie potrzebowała własnej warstwy API (np. REST lub WebSocket), której szczegóły pozostają do ustalenia. OpenHands Agent Server/SDK rozważano jako alternatywę zapewniającą więcej gotowej obsługi, lecz nie wybrano go jako podstawy.

Agent ma otrzymać narzędzia potrzebne do:

- czytania, tworzenia, zmieniania i usuwania plików w systemie gościa;
- wykonywania poleceń terminala w VM;
- uruchamiania systemu budowania, podglądu i testów utworzonej witryny;
- korzystania z Internetu i pobierania potrzebnych zasobów;
- generowania obrazów i zapisywania ich w projekcie;
- przeglądania strony, wykonywania interakcji i robienia zrzutów przez Playwright MCP;
- zadawania użytkownikowi pytań przez interfejs aplikacji;
- przekazywania wyników pracy, informacji o błędach, zmianach i historii do GUI.

Nie każde narzędzie musi być MCP. Operacje na workspace, komunikacja z GUI, zatwierdzanie publikacji i import plików mogą być natywnymi narzędziami aplikacji. MCP może być używane dla niezależnych integracji, takich jak Playwright MCP.

## 4. Model projektu witryny

Projekt użytkownika składa się z witryn statycznych. Strona wynikowa może być złożona z jednego lub wielu fragmentów HTML umieszczanych w szablonie. Szablony również mogą składać się ze współdzielonych fragmentów: np. szablon strony głównej i szablony podstron mogą wykorzystywać ten sam fragment nagłówka i stopki. System budowania scala te elementy, aby wytworzyć kompletne strony statyczne.

- **Szablon** to układ pełnej strony HTML z nazwanymi placeholderami na wspólne fragmenty, treść i elementy strony.
- **Fragment** to wielokrotnie używalny albo specyficzny dla strony fragment HTML, np. galeria, hero, karta, sekcja kontaktowa czy nawigacja.
- **Strona** wiąże odpowiedni szablon z zestawem fragmentów i treścią.
- **System budowania** scala szablony i fragmenty, a następnie wytwarza pliki statyczne gotowe do podglądu i publikacji.

Agent zna zasady i konwencje projektu oraz ma instrukcje, jak tworzyć i zmieniać strony, szablony, fragmenty i proces budowania. Może dostosować system budowania do nietypowych potrzeb, a nie tylko wypełniać niezmienny zestaw szablonów.

### Możliwa optymalizacja nawigacji

System budowania może dodatkowo wygenerować skompresowaną bazę danych zawierającą źródła lub treści stron. Skrypt działający w przeglądarce mógłby pobrać tę bazę, zapisać ją w cache, a następnie przechwytywać nawigację do innych stron i generować ich nową zawartość HTML bez oczekiwania na kolejne pobranie strony z serwera. Celem jest niemal natychmiastowe przechodzenie między stronami.

Lepszym alternatywnym rozwiązaniem jest Service Worker przechowujący bazę i serwujący z niej zasoby zamiast każdorazowo odpytywać serwer. W takim wariancie mechanizm może obsługiwać także CSS i JavaScript, pozostając przezroczysty dla skryptów działających w oknie strony. Service Worker może sprawdzać dostępność nowej wersji bazy w tle, aby aktualizacja nie opóźniała bieżącej nawigacji.

To są kierunki do analizy, a nie zatwierdzona architektura. Należy porównać oba warianty pod kątem zgodności z hostingami i przeglądarkami, rozmiaru bazy, strategii cache i aktualizacji, zachowania przy braku sieci oraz poprawnego odświeżania treści. Trzeba też ustalić, czy i jak ta optymalizacja współdziała z pełnymi plikami HTML generowanymi podczas zwykłego buildu.

### Zależności między szablonami

Witryna może mieć różne typy stron, np. osobny szablon strony głównej i podstron. Poszczególne podstrony mogą korzystać z wariantu szablonu, który celowo modyfikuje układ lub wybrane elementy.

Model powinien rozróżniać:

- współdzielone elementy całej witryny, np. nagłówek, stopkę, nawigację, kolory i typografię;
- współdzielone fragmenty składane w wielu szablonach od fragmentów specyficznych dla pojedynczego szablonu lub strony;
- niezależne typy stron, np. stronę główną i typową podstronę;
- szablony pochodne i ich jawne nadpisania;
- zmiany lokalne, które mają dotyczyć tylko konkretnej strony.

Relacje dziedziczenia i nadpisania powinny być jawnie zapisywane. Gdy agent zmienia element w szablonie bazowym, system powinien wykazać strony i szablony zależne oraz wskazać konflikty z ich lokalnymi modyfikacjami. Gdy zmiana dotyczy wariantu, system powinien porównać go z elementem bazowym i zasugerować, czy zmiana ma pozostać lokalna, czy stać się wspólna. Nie należy automatycznie propagować każdej zmiany w obie strony — może być zamierzona tylko dla jednej strony.

Do wykrywania zależności lepsze są stabilne identyfikatory i role elementów, np. „nagłówek witryny” lub „sekcja hero”, niż porównywanie dowolnych bloków HTML. Przed szerszym zastosowaniem zmiany agent powinien pokazać plan wpływu i poprosić o decyzję, jeśli zakres nie jest oczywisty.

## 5. Zachowanie agenta i wiedza o projekcie

Agent ma znać strukturę, system budowania, dostępne szablony, fragmenty, reguły projektu i typowe wzorce. Wiedza ma być zapisana w instrukcjach projektu i aktualizowana w miarę rozwoju witryny, tak aby kolejne zmiany uwzględniały wcześniej podjęte decyzje.

Instrukcje mają obejmować m.in.:

- jak tworzyć, modyfikować i budować strony;
- jak wybierać szablony i korzystać z fragmentów;
- jak zachować spójność współdzielonych elementów i wariantów;
- jak tworzyć typowe elementy stron, np. galerie zdjęć;
- jak uruchamiać podgląd i weryfikować interakcje;
- jak obsługiwać importowane obrazy, czcionki i inne zasoby;
- jak dostosować system budowania, gdy standardowe rozwiązania nie wystarczą.

Agent nie jest ograniczony do pierwotnego kodu projektu. Może dostosowywać istniejące elementy do potrzeb witryny, lecz jego działania powinny być wersjonowane i widoczne dla użytkownika jako czytelne podsumowanie zmian.

## 6. Podgląd, testowanie i feedback

Użytkownik ogląda witrynę w zwykłej przeglądarce lub osadzonym widoku aplikacji. Agent używa osobnej, headless przeglądarki sterowanej przez Playwright MCP. Może w niej otwierać lokalny podgląd projektu, sprawdzać stronę, wchodzić w interakcje i wykonywać zrzuty ekranu.

Użytkownik powinien mieć możliwość zrobienia zrzutu aktualnego podglądu, rysowania lub dodawania adnotacji na nim, wskazywania elementów strony i komentowania. Wskazanie elementu powinno przekazywać agentowi zarówno informację wizualną na zrzucie, jak i identyfikację elementu w dokumencie (np. ścieżkę DOM). Dzięki temu prośba użytkownika może zawierać zrzut z naniesionymi oznaczeniami, komentarz tekstowy oraz kontekst wskazanego elementu, co ułatwia przekazanie intencji bez rozbudowanego opisu słownego.

Użytkownik może również wskazać tekst w podglądzie, oznaczyć go jako edytowalny i ręcznie wpisać nową treść. Po wysłaniu agent otrzymuje wskazany element oraz poprzednią i nową treść, po czym wprowadza zmianę w odpowiednim źródle projektu i odświeża podgląd. Sama edycja w podglądzie jest propozycją zmiany; jej zastosowanie w plikach projektu odbywa się przez agenta, dzięki czemu może być objęte historią zmian i cofnięciem.

Przydatne informacje zwrotne dla agenta obejmują:

- zrzut samej strony, nie całego pulpitu;
- zrzut z odręcznymi oznaczeniami lub adnotacjami i dołączonymi komentarzami tekstowymi;
- wskazany element z jego ścieżką DOM oraz widocznym oznaczeniem jego położenia na zrzucie;
- ręczna edycja tekstu w podglądzie wraz z identyfikacją elementu i poprzednią oraz nową treścią, przekazywana agentowi do zastosowania;
- stały rozmiar widoku i — przy zmianach układu — również widok mobilny;
- błędy konsoli, nieudane żądania i błędy serwera, przekazywane w ograniczonym zakresie;
- wynik kontroli działania podstawowych elementów, np. menu, linków i formularzy;
- informację, które pliki i części witryny agent zmienił.

Zrzut, adnotacje, komentarze i ścieżka DOM powinny być przekazywane jako jeden kontekst dołączony do prośby użytkownika. Ścieżka DOM opisuje element w aktualnym stanie strony i może przestać być aktualna po zmianach; należy więc wiązać ją ze zrzutem/stanem podglądu, którego dotyczy.

Przeglądarka Playwright powinna działać headless, jako użytkownik niebędący rootem i z włączonym sandboxem przeglądarki. Treść otwieranych stron i tekst dostępny w drzewie dostępności należy traktować jako niezaufane dane, nie jako instrukcje dla agenta. Narzędzie MCP oraz wersja Chromium muszą być ze sobą zgodne.

## 7. Historia, snapshopy i odtwarzanie

Po każdej iteracji agenta stan projektu ma być zapamiętany. Użytkownik widzi listę zmian i może wrócić do wcześniejszego stanu lub rozpocząć odgałęzienie, aby sprawdzić inną wersję.

Wymagany efekt produktu:

- historia iteracji z opisem zmiany;
- możliwość cofnięcia wybranej zmiany;
- możliwość utworzenia odgałęzienia od wybranego stanu;
- czytelny widok wpływu zmian na strony i szablony.

Do wersjonowania plików projektu należy rozważyć Git lub równoważny mechanizm snapshotów. Pełne snapshoty obrazu QEMU mogą być zbyt duże jako mechanizm dla każdej iteracji; mogą służyć do odtwarzania środowiska, podczas gdy historia projektu przechowuje przede wszystkim pliki witryny i jej konfigurację.

Do rozstrzygnięcia pozostaje granica iteracji (np. jedna tura agenta), zachowanie przy przerwaniu lub błędzie buildu oraz sposób przywrócenia spójnego stanu po częściowej edycji. Snapshot projektu nie cofa skutków zewnętrznej publikacji; przywracanie opublikowanej wersji jest osobną funkcją do zaprojektowania.

### Eksport, import i przenośność projektu

Użytkownik powinien móc wyeksportować i zaimportować kompletny projekt witryny. Pakiet eksportowy ma zachowywać pliki robocze, zasoby, system budowania i jego konfigurację, instrukcje oraz pamięć agenta, poprzednie rozmowy, pliki wynikowe i historię Git. Import do nowszej wersji aplikacji powinien zachować te dane i — jeśli format wymaga zmian — przeprowadzić kontrolowaną migrację.

Projekt powinno dać się otworzyć także jako zwykły workspace w Visual Studio Code z Copilotem albo w Cursorze, aby użytkownik mógł kontynuować rozwój strony. Taki tryb może działać inaczej: zewnętrzny edytor lub agent może nie odtworzyć pamięci, historii rozmów, narzędzi i przepływów specyficznych dla tej aplikacji. Eksport powinien więc zachować instrukcje i istotny kontekst projektu w przenośnej formie, a różnice funkcjonalne należy jasno opisać.

Klucze API, hasła publikacyjne i inne sekrety hosta nie mogą trafiać do pakietu eksportowego. Rozmowy i pliki projektu mogą zawierać dane wrażliwe, dlatego eksport powinien jasno informować użytkownika o jego zawartości.

## 8. Lokalizacja interfejsu

Domyślnym językiem aplikacji jest angielski. Wszystkie teksty interfejsu zależne od języka powinny mieć jedno, centralne źródło. Wpisy mają być dobrze opisane: stabilny identyfikator, tekst źródłowy, kontekst użycia, wymogi dotyczące długości i placeholderów oraz informację, gdzie tekst jest używany. Referencje do użycia najlepiej generować lub utrzymywać w sposób odporny na zmianę numerów linii kodu.

Jeśli użytkownik wybierze język, dla którego nie ma gotowego pakietu, aplikacja może uruchomić w VM workflow lokalizacyjny:

1. agent tłumaczy cały katalog stringów na język docelowy;
2. drugi agent recenzuje tłumaczenie i proponuje poprawki;
3. kolejny etap sprawdza spójność terminologii i kompletność;
4. w razie problemów workflow ponawia pracę w ograniczonej liczbie prób;
5. poprawiony pakiet jest zapisywany lokalnie i używany przez GUI.

Przed uzyskaniem klucza API użytkownik nadal musi móc poruszać się po ekranie startowym. Dlatego podstawowe teksty konfiguracji, w tym prośba o podanie klucza OpenAI API, powinny być dostępne w wybranych popularnych językach już w dostarczonym pakiecie. Dla brakujących lub niepoprawnych tłumaczeń interfejs powinien użyć tekstu angielskiego, zamiast blokować użytkownika.

Walidacja lokalizacji powinna sprawdzać brakujące i nadmiarowe klucze, placeholdery, znaczniki i format. Tłumaczenie interfejsu, język rozmowy z agentem i język treści witryny to oddzielne ustawienia. Dodatkowo należy uwzględnić dłuższe teksty, formatowanie regionalne, czcionki i języki pisane od prawej do lewej.

## 9. Import plików i generowanie zasobów

Użytkownik może przekazywać do projektu pliki ze swojego komputera, np. zdjęcia. Preferowanym przepływem jest wybranie plików w GUI hosta i bezpieczne przesłanie ich do określonego katalogu projektu w VM. Agent może generować obrazy przez udostępnione narzędzie i umieszczać je w projekcie. Narzędzia powinny uwzględniać czcionki i możliwość doboru stylu wizualnego.

VM nie powinna mieć nieograniczonego dostępu do plików użytkownika na hoście. Nie należy montować całego katalogu domowego użytkownika do gościa.

## 10. Publikowanie

Publikowanie jest inicjowane przez użytkownika, np. prośbą „opublikuj stronę”. Agent ma mieć instrukcje dotyczące dostępnych metod publikacji i może dobrać właściwe narzędzie na podstawie rozmowy oraz środowiska użytkownika.

Publikacja ma być wykonywana przez aplikację lub kontrolowany broker po stronie hosta, a nie przez bezpośredni dostęp gościa do danych logowania. Przed wysłaniem warto pokazać użytkownikowi cel publikacji i podsumowanie; rzeczywiste opublikowanie powinno wymagać potwierdzenia. Powinno się przesyłać tylko wynikowy, zatwierdzony pakiet statyczny. Preferowane są bezpieczne protokoły, np. SFTP, zamiast zwykłego FTP. Obsługiwane hostingi, sposób konfiguracji i możliwość przywrócenia wcześniejszej wersji pozostają do ustalenia.

## 11. Bezpieczeństwo i granice zaufania

Założeniem jest odizolowanie pracy agenta w VM. Gość może mieć szerokie uprawnienia do własnego systemu plików i terminala, ponieważ działania są wykonywane wewnątrz VM. Nie oznacza to jednak, że agent powinien otrzymać dane lub uprawnienia hosta.

Założenia i wymagania:

- usługi gościa udostępniane przez porty QEMU nasłuchują lokalnie i odrzucają połączenia spoza hosta;
- przekierowanie portów nie może nieumyślnie wystawić panelu, API agenta ani podglądu do sieci;
- pliki hosta są przekazywane tylko po wyraźnym wyborze użytkownika;
- hasła do publikacji pozostają na hoście;
- klucz OpenAI API nie jest umieszczany w obrazie VM, plikach projektu ani logach;
- należy zdecydować, czy klucz będzie przekazywany do procesu agenta w VM tylko na czas działania, czy też host udostępni ograniczone proxy API, które zachowa klucz poza VM;
- dostęp do publikacji jest ograniczony do wybranych operacji i wymaga potwierdzenia użytkownika;
- Chromium działa jako osobny użytkownik niebędący rootem, z sandboxem;
- agent i przeglądarka nie powinny ufać instrukcjom znalezionym w treści zewnętrznych stron;
- należy kontrolować zużycie API i uświadomić użytkownikowi, że opłaty za OpenAI API są rozliczane oddzielnie od planu ChatGPT.

VM zmniejsza ryzyko dla hosta, ale nie eliminuje ryzyka wynikającego z dostępności sieci, zewnętrznych zależności, błędów hypervisora ani ujawnienia sekretu dostępnego wewnątrz gościa.

## 12. Rozważane podejścia i pozycjonowanie

Wcześniej rozważano przepływ z ChatGPT i Desktop Commanderem oraz pakiet QEMU z pustym projektem, instrukcjami dla agenta, podglądem, importem plików i publikacją. Użytkownik zakładał, że integracja Desktop Commander jest dostępna w każdym planie ChatGPT i że skrypty pakietu obsłużą konfigurację po stronie QEMU. To założenie nie było niezależnie weryfikowane w rozmowie i może wymagać sprawdzenia, jeśli ten wariant wróci do rozważań. Później jako bardziej kontrolowalny wariant wskazano własnego agenta opartego na OpenAI Agents SDK i kluczu OpenAI API użytkownika; wiąże się on z oddzielnym kosztem użycia API.

Rozważano również gotowe kreatory i platformy. Poniższe porównanie odzwierciedla informacje zebrane podczas rozmowy; oferty, limity i ceny zmieniają się i wymagają ponownej weryfikacji przed podjęciem decyzji:

| Rozwiązanie | Wnioski z rozmowy |
|---|---|
| Wix AI Website Builder | Najbardziej no-code i przyjazny dla początkujących. Wskazano darmowy wariant z adresem Wix; własna domena i pozostanie na platformie Wix wiążą użytkownika z jej hostingiem. |
| Framer | Edytor wizualny z podglądem, bez konieczności pracy ze źródłowym kodem. Wskazano darmowy plan z ograniczeniami hostingu/AI i adresem Framera; własna domena wymagała płatnego planu. |
| Lovable | Czat i podgląd, ale produkt jest bliższy budowaniu aplikacji niż samych statycznych stron. Wskazano darmowy, limitowany pakiet kredytów. |
| Bolt.diy / Bolt.new | Czat, podgląd, MCP, snapshoty i publikowanie, ale środowisko ma charakter developerski. Wskazano limity darmowego użycia i branding w darmowej publikacji. |
| Base44 | Konwersacyjny kreator no-code aplikacji full-stack. W rozmowie podano limit darmowego planu: 25 kredytów wiadomości miesięcznie i do 5 aplikacji; dane te wymagają aktualizacji przed użyciem. |
| Dyad | Darmowa aplikacja lokalna i obsługa własnych kluczy API, ale wymaga konfiguracji środowiska developerskiego (m.in. Node.js), a użycie modelu może kosztować. |
| OpenHands Agent Canvas / Agent Server | Gotowy interfejs lub backend bardziej programistycznego agenta; może być punktem odniesienia albo alternatywą dla własnego agenta, ale nie jest gotowym kreatorem stron dla laików. |

Ogólnie „darmowe” może oznaczać darmową aplikację, ograniczone kredyty modelu albo publikację pod adresem dostawcy — niekoniecznie bezpłatne użycie modelu, własną domenę czy eksport. Dokładne ceny i warunki pozostają do ponownego sprawdzenia.

ACP omówiono jako protokół komunikacji klient–agent, odrębny od MCP; nie wybrano go. OpenHands Agent Server/SDK rozważano jako gotową warstwę backendową, ale wstępnym wyborem pozostaje OpenAI Agents SDK z własnym, cienkim API dla GUI.

Potencjalnym wyróżnikiem projektu jest połączenie łatwego, konwersacyjnego UX z lokalnym, odizolowanym środowiskiem oraz możliwością otrzymania i publikacji zwykłych statycznych plików bez pokazywania użytkownikowi kodu.

## 13. Wstępne decyzje i kwestie otwarte

### Wstępne kierunki

- statyczne strony jako podstawowy zakres;
- własny interfejs Electron dla użytkownika;
- agent oparty na OpenAI Agents SDK;
- QEMU jako środowisko izolujące agenta;
- QEMU `microvm` jako kandydat na maszynę;
- minimalny Debian 13 jako kandydat na system gościa ze względu na Playwright;
- Playwright MCP i headless Chromium do interakcji, zrzutów i kontroli strony;
- praca użytkownika przede wszystkim przez rozmowę i podgląd, bez kodu i plików;
- host kontroluje import plików, sekrety i publikację;
- historia iteracji, widoczne zmiany oraz cofanie/odgałęzianie;
- lokalizacja na żądanie przez workflow agentów, z gotowymi tłumaczeniami ekranu startowego.

### Do rozstrzygnięcia

- docelowy koszt użycia, limity API, sposób prezentowania kosztów oraz ewentualne koszty generowania obrazów;
- zakres pierwszej wersji: rekomendacją do sprawdzenia jest ograniczenie MVP do jednego systemu hosta i przetestowanie pełnego przepływu przed rozszerzeniem wsparcia; nie została to jeszcze zatwierdzona decyzja;
- obsługiwane systemy hosta i architektury CPU; typ `microvm` QEMU wymaga weryfikacji na docelowym x86 i ewentualnych hostach ARM;
- konfiguracja sieci host–gość, przekazywanie portów i wiążące testy potwierdzające, że usługi są dostępne tylko lokalnie na wspieranych hostach;
- dokładny sposób budowania jądra, initramfs i obrazu Debiana dla `microvm`;
- wymagania pamięci i CPU przy jednoczesnym działaniu agenta, serwera podglądu i Chromium;
- obsługiwane modele i sposób przechowywania/udostępniania klucza OpenAI API;
- czy aplikacja hosta będzie pośredniczyć w wywołaniach API, aby klucz nie trafiał do gościa;
- katalog dostępnych metod i usług publikacji oraz sposób przechowywania poświadczeń;
- sposób prezentowania widoku strony i formularzy pytań w GUI;
- sposób obsługi promptów głosowych: rozpoznawanie mowy lokalnie czy przez usługę zewnętrzną, obsługiwane języki, wymagane zgody i sposób informowania o przetwarzaniu głosu;
- sposób mapowania tekstu edytowanego w podglądzie na źródło projektu (szablon, fragment lub treść strony), zwłaszcza dla tekstów generowanych lub współdzielonych, oraz obsługa konfliktów z równoległymi zmianami agenta;
- format pakietu eksportowego, sposób uwzględniania bieżących zmian i metadanych, wersjonowanie formatu oraz polityka migracji do nowszych wersji aplikacji;
- zakres zgodności projektu z VS Code/Copilot i Cursor, w tym przenośny format instrukcji i pamięci oraz różnice względem działania agenta w aplikacji;
- format trwałej wiedzy agenta o projekcie i sposób jej aktualizacji;
- interfejs API pomiędzy GUI a agentem oraz wybór transportu (np. REST lub WebSocket); SDK samo nie dostarcza gotowego serwera REST;
- szczegółowy schemat danych szablonów, zagnieżdżonych i współdzielonych fragmentów, zależności, wariantów i nadpisań, w tym reguły składania i wykrywania cykli;
- czy wdrożyć skompresowaną bazę treści z nawigacją obsługiwaną przez skrypt strony, czy wariant z Service Workerem; wymaga to analizy cache, aktualizacji, rozmiaru, zgodności i trybu offline;
- reguły i zakres automatycznych testów budowania, responsywności i interakcji;
- granice snapshotu, obsługa nieudanej lub częściowej iteracji oraz ewentualne odtwarzanie poprzedniej publikacji;
- limity prób oraz obsługa błędu w workflow lokalizacji;
- zakres dozwolonej autonomii agenta przy zmianie systemu budowania i instalowaniu zależności.
