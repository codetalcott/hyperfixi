/**
 * Localized command descriptions for LSP completions and hover (Phase 7.3).
 *
 * Tier 1 languages: en, ja, es, zh, ko, ar
 * Other languages fall back to English.
 */

export interface CommandDescription {
  detail: string;
  documentation: string;
}

type DescriptionMap = Record<string, CommandDescription>;

const DESCRIPTIONS: Record<string, DescriptionMap> = {
  en: {
    toggle: {
      detail: 'Toggle class/visibility',
      documentation:
        'Toggles a CSS class or attribute on an element. If the class exists, it is removed; otherwise, it is added.',
    },
    add: {
      detail: 'Add class/attribute',
      documentation: 'Adds a CSS class or attribute to an element.',
    },
    remove: {
      detail: 'Remove class/element',
      documentation: 'Removes a CSS class, attribute, or element from the DOM.',
    },
    show: {
      detail: 'Show element',
      documentation: 'Makes an element visible by removing display:none.',
    },
    hide: { detail: 'Hide element', documentation: 'Hides an element by setting display:none.' },
    put: {
      detail: 'Set content',
      documentation: 'Sets the content of an element (innerHTML, textContent, or value).',
    },
    set: { detail: 'Set variable', documentation: 'Assigns a value to a variable or property.' },
    get: {
      detail: 'Get value',
      documentation: 'Retrieves a value from an expression and stores it in the result variable.',
    },
    fetch: {
      detail: 'HTTP request',
      documentation: 'Makes an HTTP request (GET, POST, etc.) and stores the response.',
    },
    call: { detail: 'Call function', documentation: 'Calls a JavaScript function or method.' },
    send: { detail: 'Send event', documentation: 'Dispatches a custom event on an element.' },
    trigger: { detail: 'Trigger event', documentation: 'Triggers an event on an element.' },
    wait: {
      detail: 'Delay execution',
      documentation: 'Pauses execution for a specified duration.',
    },
    log: { detail: 'Log to console', documentation: 'Outputs a value to the browser console.' },
    increment: {
      detail: 'Increment value',
      documentation: 'Increases a numeric value by 1 or a specified amount.',
    },
    decrement: {
      detail: 'Decrement value',
      documentation: 'Decreases a numeric value by 1 or a specified amount.',
    },
    append: { detail: 'Append content', documentation: 'Appends content to an element or array.' },
    settle: {
      detail: 'Wait for transitions',
      documentation: 'Waits for CSS transitions/animations to complete.',
    },
    go: { detail: 'Navigate', documentation: 'Navigates to a URL or page location.' },
    throw: { detail: 'Throw error', documentation: 'Throws an error with a specified message.' },
  },

  ja: {
    toggle: {
      detail: 'クラス/表示切替',
      documentation:
        '要素のCSSクラスまたは属性を切り替えます。クラスが存在する場合は削除し、存在しない場合は追加します。',
    },
    add: { detail: 'クラス/属性追加', documentation: '要素にCSSクラスまたは属性を追加します。' },
    remove: {
      detail: 'クラス/要素削除',
      documentation: 'CSSクラス、属性、またはDOM要素を削除します。',
    },
    show: { detail: '要素表示', documentation: 'display:noneを削除して要素を表示します。' },
    hide: { detail: '要素非表示', documentation: 'display:noneを設定して要素を非表示にします。' },
    put: {
      detail: 'コンテンツ設定',
      documentation: '要素のコンテンツ（innerHTML、textContent、またはvalue）を設定します。',
    },
    set: { detail: '変数設定', documentation: '変数またはプロパティに値を代入します。' },
    get: { detail: '値取得', documentation: '式から値を取得し、result変数に格納します。' },
    fetch: {
      detail: 'HTTPリクエスト',
      documentation: 'HTTPリクエスト（GET、POSTなど）を実行し、レスポンスを格納します。',
    },
    call: { detail: '関数呼び出し', documentation: 'JavaScript関数またはメソッドを呼び出します。' },
    send: { detail: 'イベント送信', documentation: '要素にカスタムイベントをディスパッチします。' },
    trigger: { detail: 'イベントトリガー', documentation: '要素でイベントをトリガーします。' },
    wait: { detail: '実行遅延', documentation: '指定された時間だけ実行を一時停止します。' },
    log: { detail: 'コンソール出力', documentation: 'ブラウザコンソールに値を出力します。' },
    increment: { detail: '値増加', documentation: '数値を1または指定量だけ増加させます。' },
    decrement: { detail: '値減少', documentation: '数値を1または指定量だけ減少させます。' },
    append: { detail: 'コンテンツ追加', documentation: '要素または配列にコンテンツを追加します。' },
    settle: {
      detail: 'トランジション待機',
      documentation: 'CSSトランジション/アニメーションの完了を待ちます。',
    },
    go: { detail: 'ナビゲーション', documentation: 'URLまたはページ位置に移動します。' },
    throw: { detail: 'エラー送出', documentation: '指定されたメッセージでエラーを送出します。' },
  },

  es: {
    toggle: {
      detail: 'Alternar clase/visibilidad',
      documentation:
        'Alterna una clase CSS o atributo en un elemento. Si la clase existe, se elimina; de lo contrario, se agrega.',
    },
    add: {
      detail: 'Agregar clase/atributo',
      documentation: 'Agrega una clase CSS o atributo a un elemento.',
    },
    remove: {
      detail: 'Eliminar clase/elemento',
      documentation: 'Elimina una clase CSS, atributo o elemento del DOM.',
    },
    show: {
      detail: 'Mostrar elemento',
      documentation: 'Hace visible un elemento eliminando display:none.',
    },
    hide: {
      detail: 'Ocultar elemento',
      documentation: 'Oculta un elemento estableciendo display:none.',
    },
    put: {
      detail: 'Establecer contenido',
      documentation: 'Establece el contenido de un elemento (innerHTML, textContent o value).',
    },
    set: {
      detail: 'Establecer variable',
      documentation: 'Asigna un valor a una variable o propiedad.',
    },
    get: {
      detail: 'Obtener valor',
      documentation: 'Recupera un valor de una expresion y lo almacena en la variable result.',
    },
    fetch: {
      detail: 'Solicitud HTTP',
      documentation: 'Realiza una solicitud HTTP (GET, POST, etc.) y almacena la respuesta.',
    },
    call: {
      detail: 'Llamar funcion',
      documentation: 'Llama a una funcion o metodo de JavaScript.',
    },
    send: {
      detail: 'Enviar evento',
      documentation: 'Despacha un evento personalizado en un elemento.',
    },
    trigger: { detail: 'Activar evento', documentation: 'Activa un evento en un elemento.' },
    wait: {
      detail: 'Retrasar ejecucion',
      documentation: 'Pausa la ejecucion durante un tiempo especificado.',
    },
    log: {
      detail: 'Registrar en consola',
      documentation: 'Muestra un valor en la consola del navegador.',
    },
    increment: {
      detail: 'Incrementar valor',
      documentation: 'Aumenta un valor numerico en 1 o una cantidad especificada.',
    },
    decrement: {
      detail: 'Decrementar valor',
      documentation: 'Disminuye un valor numerico en 1 o una cantidad especificada.',
    },
    append: {
      detail: 'Agregar contenido',
      documentation: 'Agrega contenido a un elemento o arreglo.',
    },
    settle: {
      detail: 'Esperar transiciones',
      documentation: 'Espera a que las transiciones/animaciones CSS se completen.',
    },
    go: { detail: 'Navegar', documentation: 'Navega a una URL o ubicacion de pagina.' },
    throw: { detail: 'Lanzar error', documentation: 'Lanza un error con un mensaje especificado.' },
  },

  zh: {
    toggle: {
      detail: '切换类/可见性',
      documentation: '切换元素上的CSS类或属性。如果类存在则删除，否则添加。',
    },
    add: { detail: '添加类/属性', documentation: '向元素添加CSS类或属性。' },
    remove: { detail: '删除类/元素', documentation: '从DOM中删除CSS类、属性或元素。' },
    show: { detail: '显示元素', documentation: '通过移除display:none使元素可见。' },
    hide: { detail: '隐藏元素', documentation: '通过设置display:none隐藏元素。' },
    put: { detail: '设置内容', documentation: '设置元素的内容（innerHTML、textContent或value）。' },
    set: { detail: '设置变量', documentation: '将值赋给变量或属性。' },
    get: { detail: '获取值', documentation: '从表达式获取值并存储在result变量中。' },
    fetch: { detail: 'HTTP请求', documentation: '发起HTTP请求（GET、POST等）并存储响应。' },
    call: { detail: '调用函数', documentation: '调用JavaScript函数或方法。' },
    send: { detail: '发送事件', documentation: '在元素上派发自定义事件。' },
    trigger: { detail: '触发事件', documentation: '在元素上触发事件。' },
    wait: { detail: '延迟执行', documentation: '暂停执行指定的时间。' },
    log: { detail: '控制台输出', documentation: '将值输出到浏览器控制台。' },
    increment: { detail: '递增值', documentation: '将数值增加1或指定量。' },
    decrement: { detail: '递减值', documentation: '将数值减少1或指定量。' },
    append: { detail: '追加内容', documentation: '向元素或数组追加内容。' },
    settle: { detail: '等待过渡', documentation: '等待CSS过渡/动画完成。' },
    go: { detail: '导航', documentation: '导航到URL或页面位置。' },
    throw: { detail: '抛出错误', documentation: '使用指定消息抛出错误。' },
  },

  ko: {
    toggle: {
      detail: '클래스/표시 전환',
      documentation:
        '요소의 CSS 클래스 또는 속성을 전환합니다. 클래스가 있으면 제거하고, 없으면 추가합니다.',
    },
    add: { detail: '클래스/속성 추가', documentation: '요소에 CSS 클래스 또는 속성을 추가합니다.' },
    remove: {
      detail: '클래스/요소 제거',
      documentation: 'DOM에서 CSS 클래스, 속성 또는 요소를 제거합니다.',
    },
    show: { detail: '요소 표시', documentation: 'display:none을 제거하여 요소를 표시합니다.' },
    hide: { detail: '요소 숨기기', documentation: 'display:none을 설정하여 요소를 숨깁니다.' },
    put: {
      detail: '콘텐츠 설정',
      documentation: '요소의 콘텐츠(innerHTML, textContent 또는 value)를 설정합니다.',
    },
    set: { detail: '변수 설정', documentation: '변수 또는 속성에 값을 할당합니다.' },
    get: {
      detail: '값 가져오기',
      documentation: '표현식에서 값을 가져와 result 변수에 저장합니다.',
    },
    fetch: {
      detail: 'HTTP 요청',
      documentation: 'HTTP 요청(GET, POST 등)을 실행하고 응답을 저장합니다.',
    },
    call: { detail: '함수 호출', documentation: 'JavaScript 함수 또는 메서드를 호출합니다.' },
    send: { detail: '이벤트 전송', documentation: '요소에 커스텀 이벤트를 디스패치합니다.' },
    trigger: { detail: '이벤트 트리거', documentation: '요소에서 이벤트를 트리거합니다.' },
    wait: { detail: '실행 지연', documentation: '지정된 시간 동안 실행을 일시 중지합니다.' },
    log: { detail: '콘솔 출력', documentation: '브라우저 콘솔에 값을 출력합니다.' },
    increment: { detail: '값 증가', documentation: '숫자 값을 1 또는 지정된 양만큼 증가시킵니다.' },
    decrement: { detail: '값 감소', documentation: '숫자 값을 1 또는 지정된 양만큼 감소시킵니다.' },
    append: { detail: '콘텐츠 추가', documentation: '요소 또는 배열에 콘텐츠를 추가합니다.' },
    settle: {
      detail: '트랜지션 대기',
      documentation: 'CSS 트랜지션/애니메이션이 완료될 때까지 대기합니다.',
    },
    go: { detail: '내비게이션', documentation: 'URL 또는 페이지 위치로 이동합니다.' },
    throw: { detail: '오류 발생', documentation: '지정된 메시지로 오류를 발생시킵니다.' },
  },

  ar: {
    toggle: {
      detail: 'تبديل الفئة/الرؤية',
      documentation:
        'يبدل فئة CSS أو سمة على عنصر. إذا كانت الفئة موجودة، يتم إزالتها؛ وإلا، يتم إضافتها.',
    },
    add: { detail: 'إضافة فئة/سمة', documentation: 'يضيف فئة CSS أو سمة إلى عنصر.' },
    remove: { detail: 'إزالة فئة/عنصر', documentation: 'يزيل فئة CSS أو سمة أو عنصر من DOM.' },
    show: {
      detail: 'إظهار العنصر',
      documentation: 'يجعل العنصر مرئيًا عن طريق إزالة display:none.',
    },
    hide: { detail: 'إخفاء العنصر', documentation: 'يخفي العنصر عن طريق تعيين display:none.' },
    put: {
      detail: 'تعيين المحتوى',
      documentation: 'يعيّن محتوى العنصر (innerHTML أو textContent أو value).',
    },
    set: { detail: 'تعيين المتغير', documentation: 'يعيّن قيمة لمتغير أو خاصية.' },
    get: {
      detail: 'الحصول على قيمة',
      documentation: 'يسترجع قيمة من تعبير ويخزنها في متغير result.',
    },
    fetch: { detail: 'طلب HTTP', documentation: 'ينفذ طلب HTTP (GET، POST، إلخ) ويخزن الاستجابة.' },
    call: { detail: 'استدعاء دالة', documentation: 'يستدعي دالة أو طريقة JavaScript.' },
    send: { detail: 'إرسال حدث', documentation: 'يرسل حدثًا مخصصًا على عنصر.' },
    trigger: { detail: 'تشغيل حدث', documentation: 'يشغل حدثًا على عنصر.' },
    wait: { detail: 'تأخير التنفيذ', documentation: 'يوقف التنفيذ مؤقتًا لمدة محددة.' },
    log: { detail: 'تسجيل في وحدة التحكم', documentation: 'يخرج قيمة إلى وحدة تحكم المتصفح.' },
    increment: { detail: 'زيادة القيمة', documentation: 'يزيد قيمة رقمية بمقدار 1 أو مقدار محدد.' },
    decrement: { detail: 'إنقاص القيمة', documentation: 'ينقص قيمة رقمية بمقدار 1 أو مقدار محدد.' },
    append: { detail: 'إلحاق محتوى', documentation: 'يلحق محتوى بعنصر أو مصفوفة.' },
    settle: { detail: 'انتظار التحولات', documentation: 'ينتظر اكتمال تحولات/رسوم CSS المتحركة.' },
    go: { detail: 'التنقل', documentation: 'ينتقل إلى عنوان URL أو موقع صفحة.' },
    throw: { detail: 'رمي خطأ', documentation: 'يرمي خطأ برسالة محددة.' },
  },
};

/**
 * Get a localized description for a command.
 * Falls back to English if the language is not available.
 */
export function getCommandDescription(
  command: string,
  language: string
): CommandDescription | undefined {
  return DESCRIPTIONS[language]?.[command] ?? DESCRIPTIONS.en?.[command];
}

/**
 * Get all supported languages for descriptions.
 */
export function getDescriptionLanguages(): string[] {
  return Object.keys(DESCRIPTIONS);
}
