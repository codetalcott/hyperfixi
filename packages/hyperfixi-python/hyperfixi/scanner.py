"""
Hyperscript template scanner.

Scans Django templates and other files for hyperscript usage, detecting
which commands, blocks, and positional expressions are used.

Example:
    from hyperfixi.scanner import Scanner

    scanner = Scanner()
    usage = scanner.scan_file(Path("templates/base.html"))
    print(f"Commands: {usage.commands}")
    print(f"Blocks: {usage.blocks}")
    print(f"Positional: {usage.positional}")
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from typing import Iterable


@dataclass
class FileUsage:
    """Usage information detected from a single file."""

    commands: set[str] = field(default_factory=set)
    blocks: set[str] = field(default_factory=set)
    positional: bool = False
    detected_languages: set[str] = field(default_factory=set)

    def __bool__(self) -> bool:
        """Return True if any usage was detected."""
        return bool(self.commands or self.blocks or self.positional)

    def merge(self, other: FileUsage) -> None:
        """Merge another FileUsage into this one."""
        self.commands.update(other.commands)
        self.blocks.update(other.blocks)
        if other.positional:
            self.positional = True
        self.detected_languages.update(other.detected_languages)

    def to_dict(self) -> dict:
        """Convert to dictionary for serialization."""
        return {
            "commands": sorted(self.commands),
            "blocks": sorted(self.blocks),
            "positional": self.positional,
            "detected_languages": sorted(self.detected_languages),
        }


@dataclass
class AggregatedUsage:
    """Aggregated usage information across all files."""

    commands: set[str] = field(default_factory=set)
    blocks: set[str] = field(default_factory=set)
    positional: bool = False
    file_usage: dict[str, FileUsage] = field(default_factory=dict)
    detected_languages: set[str] = field(default_factory=set)

    def to_dict(self) -> dict:
        """Convert to dictionary for JSON serialization."""
        return {
            "commands": sorted(self.commands),
            "blocks": sorted(self.blocks),
            "positional": self.positional,
            "file_count": len(self.file_usage),
            "detected_languages": sorted(self.detected_languages),
        }


# Hyperscript extraction patterns
# From _="..." attributes and Django template tags
HYPERSCRIPT_PATTERNS = [
    # Standard attributes
    re.compile(r'_="([^"]*)"'),  # _="..."
    re.compile(r"_='([^']*)'"),  # _='...'
    re.compile(r"_=`([^`]*)`"),  # _=`...` (backticks)
    # JSX patterns (Vue, Svelte, React)
    re.compile(r"_=\{`([^`]+)`\}"),  # _={`...`} (JSX template literal)
    re.compile(r"_=\{['\"]([^'\"]+)['\"]\}"),  # _={"..."} or _={'...'} (JSX)
    # data-hs variant
    re.compile(r'data-hs="([^"]*)"'),  # data-hs="..."
    re.compile(r"data-hs='([^']*)'"),  # data-hs='...'
    # Django block tag
    re.compile(r"\{%\s*hs\s*%\}(.*?)\{%\s*endhs\s*%\}", re.DOTALL),
    # Django simple tags
    re.compile(r'\{%\s*hs_attr\s+"([^"]+)"\s*%\}'),  # {% hs_attr "..." %}
    re.compile(r"\{%\s*hs_attr\s+'([^']+)'\s*%\}"),  # {% hs_attr '...' %}
    re.compile(r'\{%\s*hs_script\s+"([^"]+)"\s*%\}'),  # {% hs_script "..." %}
    re.compile(r"\{%\s*hs_script\s+'([^']+)'\s*%\}"),  # {% hs_script '...' %}
    # Script tags
    re.compile(
        r'<script[^>]*type=["\']?text/hyperscript["\']?[^>]*>(.*?)</script>',
        re.DOTALL | re.IGNORECASE,
    ),
]

# Command detection pattern (21 commands from vite-plugin scanner.ts)
# These are the commands that can be tree-shaken in bundle generation
COMMAND_PATTERN = re.compile(
    r"\b(toggle|add|remove|removeClass|show|hide|set|get|put|append|"
    r"take|increment|decrement|log|send|trigger|wait|transition|go|call|"
    r"focus|blur|return)\b",
    re.IGNORECASE,
)

# Block detection patterns
# Each block has specific syntax requirements
BLOCK_PATTERNS: dict[str, re.Pattern[str]] = {
    "if": re.compile(r"\bif\b", re.IGNORECASE),
    "unless": re.compile(r"\bunless\b", re.IGNORECASE),  # maps to 'if' block
    "repeat": re.compile(
        r"\brepeat\s+(\d+|:\w+|\$\w+|[\w.]+)\s+times?\b", re.IGNORECASE
    ),
    "for": re.compile(r"\bfor\s+(each|every)\b", re.IGNORECASE),
    "while": re.compile(r"\bwhile\b", re.IGNORECASE),
    "fetch": re.compile(r"\bfetch\b", re.IGNORECASE),
    "async": re.compile(r"\basync\b", re.IGNORECASE),
}

# Positional expression pattern
# These expressions require the positional expression module
POSITIONAL_PATTERN = re.compile(
    r"\b(first|last|next|previous|closest|parent)\b", re.IGNORECASE
)

# Valid commands for validation (lowercase)
VALID_COMMANDS = {
    "toggle",
    "add",
    "remove",
    "removeclass",
    "show",
    "hide",
    "set",
    "get",
    "put",
    "append",
    "take",
    "increment",
    "decrement",
    "log",
    "send",
    "trigger",
    "wait",
    "transition",
    "go",
    "call",
    "focus",
    "blur",
    "return",
}

# Valid blocks for validation
VALID_BLOCKS = {"if", "repeat", "for", "while", "fetch", "async"}

# Supported languages for multilingual detection (synced with vite-plugin)
SUPPORTED_LANGUAGES = [
    "en", "es", "pt", "fr", "de", "it", "vi",  # Western (Latin script)
    "pl", "ru", "uk",                          # Slavic (Latin/Cyrillic)
    "ja", "zh", "ko",                          # East Asian
    "ar",                                       # RTL (Arabic script)
    "hi", "bn",                                 # South Asian (Indic scripts)
    "th",                                       # Southeast Asian (Thai script)
    "tr",                                       # Agglutinative Latin
    "id", "sw", "qu", "tl",                    # Other
]

# Language keyword sets for detection
# Non-English keywords that indicate a specific language is being used
LANGUAGE_KEYWORDS: dict[str, set[str]] = {
    # Japanese (hiragana, katakana, kanji) - unique script
    "ja": {
        "トグル", "切り替え", "追加", "削除", "表示", "隠す", "非表示",
        "設定", "セット", "増加", "減少", "ログ", "出力",
        "クリック", "入力", "変更", "フォーカス",
        "もし", "繰り返し", "待つ", "待機",
        "私", "それ", "結果",
        "最初", "最後", "次", "前",
    },
    # Korean (Hangul) - unique script
    "ko": {
        "토글", "전환", "추가", "제거", "삭제", "표시", "숨기다",
        "설정", "증가", "감소", "로그",
        "클릭", "입력", "변경", "포커스",
        "만약", "반복", "대기",
        "나", "내", "그것", "결과",
        "첫번째", "마지막", "다음", "이전",
    },
    # Chinese (CJK characters)
    "zh": {
        "切换", "添加", "移除", "删除", "显示", "隐藏",
        "设置", "设定", "增加", "减少", "日志", "记录",
        "点击", "输入", "改变", "聚焦",
        "如果", "重复", "等待",
        "我", "它", "结果",
        "第一", "最后", "下一个", "上一个",
    },
    # Arabic (Arabic script) - RTL
    "ar": {
        "بدّل", "بدل", "أضف", "اضف", "أزل", "ازل", "احذف",
        "أظهر", "اظهر", "أخفِ", "اخف",
        "ضع", "اضع", "زِد", "أنقص",
        "عند", "نقر", "إدخال", "تغيير",
        "إذا", "كرر", "انتظر",
        "أنا", "هو", "النتيجة",
    },
    # Spanish (Latin script with accents)
    "es": {
        "alternar", "añadir", "agregar", "quitar", "eliminar",
        "mostrar", "ocultar", "esconder",
        "establecer", "fijar", "incrementar", "decrementar",
        "clic", "entrada", "cambio",
        "sino", "repetir", "esperar", "mientras",
        "yo", "ello", "resultado",
        "primero", "último", "siguiente", "anterior",
    },
    # Portuguese (Latin script with accents)
    "pt": {
        "adicionar", "remover", "esconder",
        "definir", "clique", "mudança",
        "senão", "aguardar", "enquanto",
        "eu", "isso",
        "próximo",
    },
    # French (Latin script with accents)
    "fr": {
        "basculer", "ajouter", "supprimer", "retirer",
        "afficher", "montrer", "cacher", "masquer",
        "définir", "incrémenter", "décrémenter",
        "cliquer", "saisie", "changement",
        "sinon", "répéter", "attendre", "pendant",
        "moi", "cela", "résultat",
        "premier", "dernier", "suivant", "précédent",
    },
    # German (Latin script with umlauts)
    "de": {
        "umschalten", "hinzufügen", "entfernen", "löschen",
        "anzeigen", "zeigen", "verbergen", "verstecken",
        "setzen", "festlegen", "erhöhen", "verringern",
        "klick", "eingabe", "änderung",
        "wenn", "sonst", "wiederholen", "warten", "während",
        "ich", "ergebnis",
        "erste", "letzte", "nächste", "vorherige",
    },
    # Turkish (Latin script with special chars)
    "tr": {
        "değiştir", "değistir", "ekle", "kaldır", "kaldir", "sil",
        "göster", "gizle", "sakla",
        "ayarla", "belirle", "arttır", "azalt",
        "tıklama", "tiklama", "giriş", "giris", "değişim", "degisim",
        "eğer", "eger", "yoksa", "tekrarla", "bekle", "süresince",
        "ben", "sonuç", "sonuc",
        "ilk", "son", "sonraki", "önceki", "onceki",
    },
    # Indonesian (Latin script)
    "id": {
        "alih", "beralih", "tambah", "hapus", "buang",
        "tampilkan", "sembunyikan",
        "atur", "tetapkan", "tambahkan", "kurangi",
        "klik", "masukan", "perubahan",
        "jika", "kalau", "ulangi", "tunggu", "selama",
        "saya", "itu", "hasil",
        "pertama", "terakhir", "berikutnya", "sebelumnya",
    },
    # Swahili (Latin script)
    "sw": {
        "badilisha", "ongeza", "ondoa", "futa",
        "onyesha", "ficha",
        "weka", "sanidi", "ongezea", "punguza",
        "bofya", "ingizo", "badiliko",
        "ikiwa", "kama", "rudia", "subiri", "wakati",
        "mimi", "hiyo", "matokeo",
        "kwanza", "mwisho", "inayofuata", "iliyotangulia",
    },
    # Quechua (Latin script)
    "qu": {
        "tikray", "yapay", "qichuy", "pichay",
        "rikuchiy", "pakay",
        "churay", "pisiyachiy",
        "ñit'iy", "yaykuchiy",
        "sichus", "mana", "kutipay", "suyay", "chaykama",
        "ñuqa", "chay", "lluqsisqa",
        "ñawpaq", "qhipa", "hamuq", "ñawpaqnin",
    },
    # Italian (Latin script)
    "it": {
        "commutare", "alternare", "aggiungere", "rimuovere", "eliminare",
        "mostrare", "nascondere", "impostare", "incrementare", "decrementare",
        "clic", "ingresso", "cambiamento",
        "altrimenti", "ripetere", "aspettare", "attendere", "mentre",
        "risultato",
        "primo", "ultimo", "successivo", "precedente",
    },
    # Vietnamese (Latin script with diacritics)
    "vi": {
        "chuyển đổi", "bật tắt", "thêm", "xóa", "gỡ bỏ",
        "hiển thị", "ẩn", "gán", "thiết lập", "tăng", "giảm",
        "kích hoạt", "gửi",
        "nếu", "không thì", "lặp lại", "chờ", "đợi", "trong khi",
        "kết quả",
        "đầu tiên", "cuối cùng", "tiếp theo", "trước",
    },
    # Polish (Latin script)
    "pl": {
        "przełącz", "przelacz", "dodaj", "usuń", "usun",
        "pokaż", "pokaz", "ukryj", "ustaw", "zwiększ", "zwieksz", "zmniejsz",
        "kliknięcie", "klikniecie", "wywołaj", "wywolaj", "wyślij", "wyslij",
        "jeśli", "jesli", "jeżeli", "jezeli", "inaczej", "powtórz", "powtorz",
        "czekaj", "poczekaj", "dopóki", "dopoki",
        "wynik",
        "pierwszy", "ostatni", "następny", "nastepny", "poprzedni",
    },
    # Russian (Cyrillic script)
    "ru": {
        "переключить", "добавить", "удалить", "убрать",
        "показать", "скрыть", "установить", "увеличить", "уменьшить",
        "вызвать", "отправить",
        "если", "иначе", "повторить", "ждать", "пока",
        "результат",
        "первый", "последний", "следующий", "предыдущий",
    },
    # Ukrainian (Cyrillic script)
    "uk": {
        "перемкнути", "додати", "видалити", "прибрати",
        "показати", "сховати", "приховати", "встановити", "збільшити", "зменшити",
        "викликати", "надіслати",
        "якщо", "інакше", "повторити", "чекати", "поки",
        "результат",
        "перший", "останній", "наступний", "попередній",
    },
    # Hindi (Devanagari script)
    "hi": {
        "टॉगल", "बदलें", "जोड़ें", "हटाएं", "मिटाएं",
        "दिखाएं", "छिपाएं", "सेट", "बढ़ाएं", "घटाएं",
        "ट्रिगर", "भेजें",
        "अगर", "यदि", "वरना", "दोहराएं", "प्रतीक्षा", "जब तक",
        "परिणाम",
        "पहला", "आखिरी", "अगला", "पिछला",
    },
    # Bengali (Bengali script)
    "bn": {
        "টগল", "পরিবর্তন", "যোগ", "সরান", "মুছুন",
        "দেখান", "লুকান", "সেট", "বৃদ্ধি", "হ্রাস",
        "ট্রিগার", "পাঠান",
        "যদি", "নতুবা", "পুনরাবৃত্তি", "অপেক্ষা", "যতক্ষণ",
        "ফলাফল",
        "প্রথম", "শেষ", "পরবর্তী", "আগের",
    },
    # Thai (Thai script)
    "th": {
        "สลับ", "เพิ่ม", "ลบ", "ลบออก",
        "แสดง", "ซ่อน", "ตั้ง", "กำหนด", "เพิ่มค่า", "ลดค่า",
        "ทริกเกอร์", "ส่ง",
        "ถ้า", "หาก", "ไม่งั้น", "ทำซ้ำ", "รอ", "ในขณะที่",
        "ผลลัพธ์",
        "แรก", "สุดท้าย", "ถัดไป", "ก่อนหน้า",
    },
    # Tagalog (Latin script)
    "tl": {
        "palitan", "itoggle", "idagdag", "magdagdag", "alisin", "tanggalin",
        "ipakita", "magpakita", "itago", "magtago",
        "itakda", "magtakda", "dagdagan", "taasan", "bawasan", "ibaba",
        "magpatugtog", "ipadala", "magpadala",
        "kung", "kapag", "kung_hindi", "kundi", "ulitin", "paulit-ulit",
        "maghintay", "hintay", "habang",
    },
}

# Regional bundle mappings
REGIONS = {
    "western": ["en", "es", "pt", "fr", "de", "it"],
    "east-asian": ["ja", "zh", "ko"],
    "southeast-asian": ["id", "vi", "th", "tl"],
    "south-asian": ["hi", "bn"],
    "slavic": ["pl", "ru", "uk"],
    "priority": ["en", "es", "pt", "fr", "de", "it", "ja", "zh", "ko", "ar", "tr", "id", "vi"],
    "all": SUPPORTED_LANGUAGES,
}


def detect_languages(script: str) -> set[str]:
    """
    Detect non-English languages in a hyperscript string.

    Uses keyword detection to identify which languages are being used.
    English is never detected (it's the default).

    Args:
        script: The hyperscript code to analyze

    Returns:
        Set of detected language codes (e.g., {"ja", "es"})
    """
    detected: set[str] = set()
    script_lower = script.lower()

    # Non-Latin scripts don't need word boundary matching
    # Includes: CJK (ja, ko, zh), Arabic (ar), Cyrillic (ru, uk),
    # Indic (hi, bn), Thai (th)
    non_latin_langs = {"ja", "ko", "zh", "ar", "ru", "uk", "hi", "bn", "th"}

    for lang, keywords in LANGUAGE_KEYWORDS.items():
        if lang in non_latin_langs:
            # Non-Latin scripts - simple includes check
            for keyword in keywords:
                if keyword in script:
                    detected.add(lang)
                    break
        else:
            # Latin-script languages - check for word boundaries
            for keyword in keywords:
                if len(keyword) <= 2:
                    continue  # Skip very short keywords (too many false positives)
                pattern = re.compile(rf"\b{re.escape(keyword.lower())}\b")
                if pattern.search(script_lower):
                    detected.add(lang)
                    break

    return detected


def get_optimal_region(languages: set[str]) -> str | None:
    """
    Get the optimal regional bundle for detected languages.

    Returns the smallest bundle that covers all detected languages.

    Args:
        languages: Set of detected language codes

    Returns:
        Region name or None if no languages detected
    """
    if not languages:
        return None

    lang_list = list(languages)

    # Check smallest bundles first, ordered by typical bundle size
    # Single-region bundles (smallest)
    if all(lang in REGIONS["east-asian"] for lang in lang_list):
        return "east-asian"

    if all(lang in REGIONS["south-asian"] for lang in lang_list):
        return "south-asian"

    if all(lang in REGIONS["slavic"] for lang in lang_list):
        return "slavic"

    if all(lang in REGIONS["southeast-asian"] for lang in lang_list):
        return "southeast-asian"

    if all(lang in REGIONS["western"] for lang in lang_list):
        return "western"

    # Priority bundle (medium)
    if all(lang in REGIONS["priority"] for lang in lang_list):
        return "priority"

    # Need full bundle
    return "all"


class Scanner:
    """
    Scanner class for detecting hyperscript usage in files.

    Example:
        scanner = Scanner()
        usage = scanner.scan_file(Path("templates/base.html"))
        print(f"Commands: {usage.commands}")

        # Scan entire directory
        results = scanner.scan_directory(Path("templates"))
        for path, usage in results.items():
            print(f"{path}: {usage.commands}")
    """

    def __init__(
        self,
        *,
        include_extensions: set[str] | None = None,
        exclude_patterns: list[str] | None = None,
        debug: bool = False,
    ) -> None:
        """
        Initialize the scanner.

        Args:
            include_extensions: File extensions to scan (default: .html, .htm, .txt, .xml)
            exclude_patterns: Directory/file patterns to exclude
            debug: Enable debug logging
        """
        self.include_extensions = include_extensions or {
            ".html",
            ".htm",
            ".txt",
            ".xml",
            ".jinja",
            ".jinja2",
        }
        self.exclude_patterns = exclude_patterns or [
            "__pycache__",
            ".git",
            "node_modules",
            ".venv",
            "venv",
            "site-packages",
        ]
        self.debug = debug

    def should_scan(self, path: Path) -> bool:
        """Check if a file should be scanned."""
        if path.suffix.lower() not in self.include_extensions:
            return False

        path_str = str(path)
        for pattern in self.exclude_patterns:
            if pattern in path_str:
                return False

        return True

    def extract_hyperscript(self, content: str) -> list[str]:
        """
        Extract all hyperscript snippets from content.

        Handles various attribute formats and Django template tags.

        Args:
            content: The file content to scan

        Returns:
            List of hyperscript code snippets found
        """
        scripts: list[str] = []

        for pattern in HYPERSCRIPT_PATTERNS:
            for match in pattern.finditer(content):
                script = match.group(1).strip()
                if script:
                    scripts.append(script)

        return scripts

    def analyze_script(self, script: str) -> FileUsage:
        """
        Analyze a hyperscript snippet for commands, blocks, expressions, and languages.

        Args:
            script: The hyperscript code to analyze

        Returns:
            FileUsage with detected commands, blocks, positional flag, and languages
        """
        usage = FileUsage()

        # Detect commands
        for match in COMMAND_PATTERN.finditer(script):
            usage.commands.add(match.group(1).lower())

        # Detect blocks
        for block_name, pattern in BLOCK_PATTERNS.items():
            if pattern.search(script):
                # 'unless' uses the same implementation as 'if'
                if block_name == "unless":
                    usage.blocks.add("if")
                else:
                    usage.blocks.add(block_name)

        # Detect positional expressions
        if POSITIONAL_PATTERN.search(script):
            usage.positional = True

        # Detect non-English languages
        usage.detected_languages = detect_languages(script)

        return usage

    def scan_content(self, content: str, file_path: str = "<string>") -> FileUsage:
        """
        Scan content for hyperscript usage.

        Args:
            content: The file content to scan
            file_path: Path for debug logging

        Returns:
            FileUsage with detected usage
        """
        usage = FileUsage()

        scripts = self.extract_hyperscript(content)
        for script in scripts:
            script_usage = self.analyze_script(script)
            usage.merge(script_usage)

        if self.debug and usage:
            print(
                f"[hyperfixi] Scanned {file_path}: "
                f"commands={sorted(usage.commands)}, "
                f"blocks={sorted(usage.blocks)}, "
                f"positional={usage.positional}"
            )

        return usage

    def scan_file(self, path: Path) -> FileUsage:
        """
        Scan a single file for hyperscript usage.

        Args:
            path: Path to the file

        Returns:
            FileUsage with detected usage
        """
        try:
            content = path.read_text(encoding="utf-8")
            return self.scan_content(content, str(path))
        except Exception as e:
            if self.debug:
                print(f"[hyperfixi] Error reading {path}: {e}")
            return FileUsage()

    def scan_directory(self, directory: Path) -> dict[str, FileUsage]:
        """
        Scan all template files in a directory.

        Args:
            directory: Directory to scan

        Returns:
            Dict mapping file paths to their usage
        """
        results: dict[str, FileUsage] = {}

        if not directory.exists():
            return results

        for path in directory.rglob("*"):
            if path.is_file() and self.should_scan(path):
                usage = self.scan_file(path)
                if usage:
                    results[str(path)] = usage

        return results

    def scan_directories(self, directories: Iterable[Path]) -> dict[str, FileUsage]:
        """
        Scan multiple directories for hyperscript usage.

        Args:
            directories: Directories to scan

        Returns:
            Dict mapping file paths to their usage
        """
        results: dict[str, FileUsage] = {}

        for directory in directories:
            dir_results = self.scan_directory(directory)
            results.update(dir_results)

        return results
