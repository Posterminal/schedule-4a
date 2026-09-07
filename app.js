"use strict";

/* ---------- Налаштування тривог NEPTUN ---------- */

const NEPTUN_API_URL = "https://neptun.in.ua/api/v1/alerts";
const ALERT_REGION_KEY = "бориспільський";
const ALERT_REGION_NAME = "Бориспільський район";
const ALERT_OBLAST = "Київська область";

/* ---------- Дні та предмети ---------- */

const DAYS = {
  1: "Понеділок",
  2: "Вівторок",
  3: "Середа",
  4: "Четвер",
  5: "П’ятниця",
};

const SHORT_DAYS = {
  1: "Пн",
  2: "Вт",
  3: "Ср",
  4: "Чт",
  5: "Пт",
};

const SUBJECTS = {
  1: [
    "Англ. мова",
    "Математика",
    "ЯПС",
    "Фізкультура",
    "ЯПС",
    "ЯПС",
  ],

  2: [
    "ЯПС",
    "Укр. мова",
    "Укр. мова",
    "ЯПС",
    "ЯПС",
  ],

  3: [
    "ЯПС",
    "Математика",
    "ЯПС",
    "ЯПС",
    "Мистецтво",
  ],

  4: [
    "Укр. мова",
    "Математика",
    "Англ. мова",
    "Фізкультура",
    "Укр. мова",
  ],

  5: [
    "Укр. мова",
    "Математика",
    "Інф. / Англ.",
    "Англ. мова",
    "Укр. мова",
  ],
};

/* ---------- Години уроків ---------- */

/* Понеділок: перший урок о 12:00 */
const MONDAY_TIMES = [
  { start: "12:00", end: "12:35" },
  { start: "12:50", end: "13:25" },
  { start: "13:35", end: "14:10" },
  { start: "14:15", end: "14:50" },
  { start: "14:55", end: "15:30" },
  { start: "15:35", end: "16:10" },
];

/* Вівторок–п’ятниця: перший урок о 12:50 */
const REGULAR_TIMES = [
  { start: "12:50", end: "13:25" },
  { start: "13:40", end: "14:15" },
  { start: "14:25", end: "15:00" },
  { start: "15:05", end: "15:40" },
  { start: "15:45", end: "16:20" },
  { start: "16:25", end: "17:00" },
];

/* ---------- Zoom ---------- */

const ZOOM_LINKS = {
  english: {
    url: "https://us04web.zoom.us/j/5187222893?pwd=S0VKMURxbGlnUGJveVNYVndtM3ErUT09",
    id: "518 722 2893",
    passcode: "12345",
  },

  pe: {
    url: "https://us04web.zoom.us/j/75073841959?pwd=VgHN4EPVKmilnAKa9EpR7ebbEfy69g.1",
    id: "750 7384 1959",
    passcode: "7MEgJW",
  },

  general: {
    url: "https://us05web.zoom.us/j/81980314443?pwd=NHBKN2pabWxWV284ZXlKVnFyN1Bzdz09",
    id: "819 8031 4443",
    passcode: "E0T9RG",
  },
};

function getZoomForSubject(subject) {
  if (subject === "Англ. мова") {
    return ZOOM_LINKS.english;
  }

  if (subject === "Фізкультура") {
    return ZOOM_LINKS.pe;
  }

  return ZOOM_LINKS.general;
}

/* ---------- Стан застосунку ---------- */

const state = {
  selectedDay: 1,
  currentAlert: null,
};

/* ---------- Час у Києві ---------- */

function getKyivTime() {
  const pieces = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Kyiv",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());

  const get = (type) => pieces.find((part) => part.type === type)?.value;

  const dayMap = {
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
    Sun: 0,
  };

  return {
    weekday: dayMap[get("weekday")],
    hour: Number(get("hour")),
    minute: Number(get("minute")),
    second: Number(get("second")),
  };
}

function getWeekDayInKyiv() {
  const weekday = getKyivTime().weekday;

  if (weekday >= 1 && weekday <= 5) {
    return weekday;
  }

  return 1;
}

function timeToMinutes(time) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function formatSeconds(seconds) {
  const safeSeconds = Math.max(0, Math.floor(seconds));

  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const restSeconds = safeSeconds % 60;

  return [
    String(hours).padStart(2, "0"),
    String(minutes).padStart(2, "0"),
    String(restSeconds).padStart(2, "0"),
  ].join(":");
}

/* ---------- Розклад ---------- */

function getLessons(day) {
  const times = day === 1 ? MONDAY_TIMES : REGULAR_TIMES;

  return SUBJECTS[day].map((subject, index) => ({
    number: index + 1,
    subject,
    start: times[index].start,
    end: times[index].end,
    zoom: getZoomForSubject(subject),
  }));
}

function getActiveSchoolEvent() {
  const kyiv = getKyivTime();

  if (kyiv.weekday === 0 || kyiv.weekday === 6) {
    return { type: "weekend" };
  }

  const lessons = getLessons(kyiv.weekday);
  const nowInSeconds =
    kyiv.hour * 3600 + kyiv.minute * 60 + kyiv.second;

  for (let index = 0; index < lessons.length; index += 1) {
    const lesson = lessons[index];
    const start = timeToMinutes(lesson.start) * 60;
    const end = timeToMinutes(lesson.end) * 60;

    if (nowInSeconds >= start && nowInSeconds < end) {
      return {
        type: "lesson",
        lesson,
        secondsLeft: end - nowInSeconds,
        progress: ((nowInSeconds - start) / (end - start)) * 100,
      };
    }

    const nextLesson = lessons[index + 1];

    if (nextLesson) {
      const nextStart = timeToMinutes(nextLesson.start) * 60;

      if (nowInSeconds >= end && nowInSeconds < nextStart) {
        return {
          type: "break",
          nextLesson,
          secondsLeft: nextStart - nowInSeconds,
          progress: ((nowInSeconds - end) / (nextStart - end)) * 100,
        };
      }
    }
  }

  const firstLesson = lessons[0];
  const firstStart = timeToMinutes(firstLesson.start) * 60;

  if (nowInSeconds < firstStart) {
    return {
      type: "before",
      lesson: firstLesson,
      secondsLeft: firstStart - nowInSeconds,
    };
  }

  return { type: "after" };
}

/* ---------- Таймер ---------- */

function updateTimer() {
  const timerTitle = document.getElementById("timerTitle");
  const timer = document.getElementById("timer");
  const description = document.getElementById("timerDescription");
  const nextEvent = document.getElementById("nextEvent");
  const progressBar = document.getElementById("progressBar");

  const event = getActiveSchoolEvent();

  if (event.type === "lesson") {
    timerTitle.textContent = `Зараз ${event.lesson.number}-й урок`;
    timer.textContent = formatSeconds(event.secondsLeft);
    description.textContent =
      `${event.lesson.subject} · ${event.lesson.start}–${event.lesson.end}`;
    nextEvent.textContent = "Перерва після уроку";
    progressBar.style.width = `${event.progress}%`;
  }

  if (event.type === "break") {
    timerTitle.textContent = "Зараз перерва";
    timer.textContent = formatSeconds(event.secondsLeft);
    description.textContent =
      `До ${event.nextLesson.number}-го уроку: ${event.nextLesson.subject}`;
    nextEvent.textContent =
      `${event.nextLesson.number}. ${event.nextLesson.subject} · ${event.nextLesson.start}`;
    progressBar.style.width = `${event.progress}%`;
  }

  if (event.type === "before") {
    timerTitle.textContent = "До початку уроків";
    timer.textContent = formatSeconds(event.secondsLeft);
    description.textContent = `Перший урок: ${event.lesson.subject}`;
    nextEvent.textContent =
      `${event.lesson.number}. ${event.lesson.subject} · ${event.lesson.start}`;
    progressBar.style.width = "0%";
  }

  if (event.type === "after") {
    timerTitle.textContent = "Уроки завершено";
    timer.textContent = "✓";
    description.textContent = "На сьогодні уроків більше немає";
    nextEvent.textContent = "Перевірте розклад на завтра";
    progressBar.style.width = "100%";
  }

  if (event.type === "weekend") {
    timerTitle.textContent = "Вихідний";
    timer.textContent = "☀️";
    description.textContent = "Сьогодні уроків за розкладом немає";
    nextEvent.textContent = "Уроки продовжаться у понеділок";
    progressBar.style.width = "0%";
  }

  renderDaySchedule();
}

/* ---------- Вибір дня ---------- */

function renderDayButtons() {
  const container = document.getElementById("dayButtons");

  container.innerHTML = Object.entries(DAYS)
    .map(
      ([number]) => `
        <button
          class="day-button ${
            Number(number) === state.selectedDay ? "active" : ""
          }"
          data-day="${number}"
        >
          ${SHORT_DAYS[number]}
        </button>
      `
    )
    .join("");

  container.querySelectorAll(".day-button").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedDay = Number(button.dataset.day);
      renderDayButtons();
      renderDaySchedule();
    });
  });
}

/* ---------- Розклад на день ---------- */

function renderDaySchedule() {
  const day = state.selectedDay;
  const lessons = getLessons(day);
  const currentKyivDay = getKyivTime().weekday;
  const currentEvent = getActiveSchoolEvent();

  document.getElementById("dayTitle").textContent = DAYS[day];

  document.getElementById("dayInfo").textContent =
    day === 1
      ? "Початок уроків о 12:00"
      : "Початок уроків о 12:50";

  const currentLessonNumber =
    currentKyivDay === day && currentEvent.type === "lesson"
      ? currentEvent.lesson.number
      : null;

  document.getElementById("scheduleList").innerHTML = lessons
    .map(
      (lesson) => `
        <article class="schedule-item ${
          lesson.number === currentLessonNumber ? "current" : ""
        }">
          <div class="lesson-number">${lesson.number}</div>

          <div>
            <p class="lesson-name">${lesson.subject}</p>
            <p class="lesson-time">${lesson.start}–${lesson.end}</p>
          </div>

          <div class="lesson-actions">
            <a
              class="zoom-button"
              href="${lesson.zoom.url}"
              target="_blank"
              rel="noopener noreferrer"
              title="Відкрити Zoom"
            >
              Zoom
            </a>

            <div class="now-label">
              ${lesson.number === currentLessonNumber ? "Зараз" : ""}
            </div>
          </div>
        </article>
      `
    )
    .join("");
}

/* ---------- Розклад на тиждень ---------- */

function renderWeekSchedule() {
  const container = document.getElementById("weekSchedule");

  container.innerHTML = Object.entries(DAYS)
    .map(([day, dayName]) => {
      const lessons = getLessons(Number(day));

      return `
        <article class="week-day">
          <h3>${dayName}</h3>

          <ul>
            ${lessons
              .map(
                (lesson) => `
                  <li>
                    <span>${lesson.number}.</span>

                    <div>
                      <b>${lesson.subject}</b><br>
                      <small>${lesson.start}–${lesson.end}</small><br>

                      <a
                        class="zoom-week-link"
                        href="${lesson.zoom.url}"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Відкрити Zoom
                      </a>
                    </div>
                  </li>
                `
              )
              .join("")}
          </ul>
        </article>
      `;
    })
    .join("");
}

/* ---------- NEPTUN: повітряні тривоги ---------- */

async function loadAlertStatus() {
  const card = document.getElementById("alertCard");
  const icon = document.getElementById("alertIcon");
  const title = document.getElementById("alertTitle");
  const description = document.getElementById("alertDescription");

  try {
    const response = await fetch(NEPTUN_API_URL, {
      method: "GET",
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`NEPTUN повернув помилку ${response.status}`);
    }

    const data = await response.json();
    const regions = Array.isArray(data.regions) ? data.regions : [];

    const isAlertActive = regions.some((region) => {
      const key = String(region.key || "").toLowerCase();
      const name = String(region.name || "").toLowerCase();
      const oblast = String(region.oblast || "").toLowerCase();

      return (
        key === ALERT_REGION_KEY ||
        (name === ALERT_REGION_NAME.toLowerCase() &&
          oblast === ALERT_OBLAST.toLowerCase())
      );
    });

    card.className = `alert-card ${isAlertActive ? "danger" : "safe"}`;
    icon.textContent = isAlertActive ? "🚨" : "✓";

    if (isAlertActive) {
      title.textContent = "Повітряна тривога";
      description.textContent =
        "Бориспільський район · Перейдіть до укриття.";

      if (state.currentAlert === false) {
        showNotification(
          "🚨 Повітряна тривога",
          "Бориспільський район. Виконуйте вказівки школи."
        );
      }
    } else {
      title.textContent = "Тривоги немає";
      description.textContent =
        "Бориспільський район, Київська область · уроки за розкладом";

      if (state.currentAlert === true) {
        showNotification(
          "✅ Відбій тривоги",
          "Перевірте повідомлення школи щодо продовження уроків."
        );
      }
    }

    state.currentAlert = isAlertActive;
  } catch (error) {
    console.warn("Помилка отримання NEPTUN:", error);

    card.className = "alert-card error";
    icon.textContent = "!";
    title.textContent = "Не вдалося оновити статус тривоги";
    description.textContent =
      "Перевірте офіційні джерела або застосунок «Повітряна тривога».";
  }
}

/* ---------- Сповіщення ---------- */

async function enableNotifications() {
  if (!("Notification" in window)) {
    alert("Ваш браузер не підтримує сповіщення.");
    return;
  }

  const permission = await Notification.requestPermission();

  if (permission === "granted") {
    showNotification(
      "Сповіщення увімкнено",
      "Розклад 4-А зможе повідомляти про зміну статусу тривоги."
    );
  }
}

function showNotification(title, body) {
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification(title, { body });
  }
}

/* ---------- День / Тиж
