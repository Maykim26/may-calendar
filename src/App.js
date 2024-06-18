import { useCallback, useMemo, useRef, useState, useEffect } from "react";
import axios from "axios";
import { db } from "./firebase";
import "@mobiscroll/react/dist/css/mobiscroll.min.css";

import {
    doc,
    getDoc,
    collection,
    addDoc,
    updateDoc,
    deleteDoc,
    getDocs,
} from "firebase/firestore";
import {
    Button,
    Datepicker,
    Dropdown,
    Eventcalendar,
    Input,
    Popup,
    Segmented,
    SegmentedGroup,
    setOptions,
    Snackbar,
    Select,
    Switch,
    Textarea,
    Toast,
} from "@mobiscroll/react";
import "./App.css";
setOptions({
    theme: "ios",
    themeVariant: "light",
});

const now = new Date();

const defaultEvents = [];

const colors = [
    "#ffeb3c",
    "#ff9900",
    "#f44437",
    "#ea1e63",
    "#9c26b0",
    "#3f51b5",
    "#009788",
    "#4baf4f",
    "#7e5d4e",
];

function App() {
    const [test, setTest] = useState();
    const [events, setEvents] = useState([]);
    const [myEvents, setMyEvents] = useState(defaultEvents);
    const [tempEvent, setTempEvent] = useState(null);
    const [undoEvent, setUndoEvent] = useState(null);
    const [isOpen, setOpen] = useState(false);
    const [isToastOpen, setToastOpen] = useState(false);
    const [toastText, setToastText] = useState();
    const [isEdit, setEdit] = useState(false);
    const [anchor, setAnchor] = useState(null);
    const [start, startRef] = useState(null);
    const [end, endRef] = useState(null);
    const [popupEventTitle, setTitle] = useState("");
    const [popupEventSelect, setSelect] = useState("");
    const [popupEventAllDay, setAllDay] = useState(true);
    const [popupTravelTime, setTravelTime] = useState(0);
    const [popupEventDate, setDate] = useState([]);
    const [popupEventStatus, setStatus] = useState("busy");
    const [mySelectedDate, setSelectedDate] = useState(now);
    const [colorPickerOpen, setColorPickerOpen] = useState(false);
    const [colorAnchor, setColorAnchor] = useState(null);
    const [selectedColor, setSelectedColor] = useState("");
    const [color, setColor] = useState("");
    const [tempColor, setTempColor] = useState("");
    const [isSnackbarOpen, setSnackbarOpen] = useState(false);

    const [selectedPM, setSelectedPM] = useState(""); // 선택된 PM 값을 저장하는 상태 변수
    const [selectedWorker, setSelectedWorker] = useState([]); // 선택된 작업자 값을 저장하는 상태 변수
    const [startDate, setStartDate] = useState(null);
    const [endDate, setEndDate] = useState(null);
    const colorPicker = useRef();

    const fetchData = async () => {
        try {
            const [docSnap, workerSnap] = await Promise.all([
                getDoc(doc(db, "test", "eventId")),
                getDocs(collection(db, "workerCollection")), // 작업자 데이터 가져오기
            ]);

            if (docSnap.exists()) {
                const eventData = docSnap.data();
                loadPopupForm(eventData, workerSnap.docs); // 가져온 데이터로 폼 로드
            } else {
                console.log("No such document!");
            }
        } catch (error) {
            console.error("Error fetching document: ", error);
        }
    };
    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        const fetchEvents = async () => {
            const eventsCol = collection(db, "test");
            const eventSnapshot = await getDocs(eventsCol);
            const eventsList = eventSnapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            }));
            setEvents(eventsList);
            setMyEvents(eventsList);
        };

        fetchEvents();
    }, []);

    async function getTest() {
        const docRef = doc(db, "test");
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            setTest(docSnap.data());
        }
    }
    const saveEvent = useCallback(async () => {
        const startDate =
            popupEventDate[0] instanceof Date && !isNaN(popupEventDate[0])
                ? popupEventDate[0]
                : new Date();
        const endDate =
            popupEventDate[1] instanceof Date && !isNaN(popupEventDate[1])
                ? popupEventDate[1]
                : new Date();

        // 작업자 정보를 ID와 이름을 포함한 객체의 배열로 변환
        const selectedWorkerInfo = selectedWorker.map((workerId) => {
            const worker = myData.find((data) => data.value === workerId);
            return {
                id: workerId,
                name: worker ? worker.text : "",
            };
        });

        const newEvent = {
            title: popupEventTitle || "New event",
            start: startDate.toISOString(),
            end: endDate.toISOString(),
            selectedPM: getSelectedPMName(selectedPM),
            selectedWorker: selectedWorkerInfo,
            color: selectedColor || "",
        };

        try {
            if (isEdit) {
                const eventRef = doc(db, "test", tempEvent.id);
                await updateDoc(eventRef, newEvent);
                const updatedEvents = myEvents.map((event) =>
                    event.id === tempEvent.id
                        ? { id: event.id, ...newEvent }
                        : event
                );
                setMyEvents(updatedEvents);
            } else {
                const docRef = await addDoc(collection(db, "test"), newEvent);
                setMyEvents([...myEvents, { id: docRef.id, ...newEvent }]);
            }
            setOpen(false);
        } catch (error) {
            console.error("Error saving event:", error);
        }
    }, [
        isEdit,
        myEvents,
        popupEventTitle,
        popupEventDate,
        selectedPM,
        selectedWorker,
        selectedColor,
    ]);

    // 번호에 해당하는 PM의 이름을 찾는 함수
    const getSelectedPMName = (selectedPM) => {
        const pm = myData.find((data) => data.value === selectedPM);
        return pm ? pm.text : "";
    };
    const getSelectedWorkerName = (worker) => {
        if (!Array.isArray(worker)) {
            return [];
        }
        const selectedWorkerData = myData.filter((data) =>
            worker.includes(data.value)
        );
        return selectedWorkerData.map((data) => data.text);
    };

    const deleteEvent = useCallback(
        async (event) => {
            try {
                await deleteDoc(doc(db, "test", event.id));
                setMyEvents(myEvents.filter((item) => item.id !== event.id));
            } catch (error) {
                console.error("Error deleting event:", error);
            }
        },
        [myEvents]
    );
    // PM 및 Worker collection에서 문서를 가져오는 함수
    const getPMById = async (pmId) => {
        const pmDoc = await getDoc(doc(db, "pmCollection", pmId));
        return pmDoc.data();
    };

    const getWorkerById = async (workerId) => {
        const workerDoc = await getDoc(doc(db, "workerCollection", workerId));
        return workerDoc.data();
    };
    const loadPopupForm = useCallback((event) => {
        setTitle(event.title || "");
        setSelect("");
        setDate([event.start, event.end]);
        setSelectedColor(event.color || "");

        const { selectedPM, selectedWorker } = event;

        setSelectedPM(selectedPM);
        const workerArray = Array.isArray(selectedWorker) ? selectedWorker : [];
        console.log("Worker Array:", workerArray);

        setSelectedWorker(workerArray);

        // 수정 창이 열리도록 setOpen(true) 호출
        setOpen(true);
    }, []);

    const myView = useMemo(
        () => ({
            calendar: {
                labels: true,
                popover: true,
                popoverClass: "custom-event-popover",
            },
        }),
        []
    );

    const colorButtons = useMemo(
        () => [
            "cancel",
            {
                text: "Set",
                keyCode: "enter",
                handler: () => {
                    setSelectedColor(tempColor);
                    setColorPickerOpen(false);
                },
                cssClass: "mbsc-popup-button-primary",
            },
        ],
        [tempColor]
    );
    const handleStartChange = useCallback((value) => {
        setStartDate(value);
    }, []);

    const handleEndChange = useCallback((value) => {
        setEndDate(value);
    }, []);

    const handleToastClose = useCallback(() => {
        setToastOpen(false);
    }, []);
    const colorResponsive = useMemo(
        () => ({
            medium: {
                display: "anchored",
                touchUi: false,
                buttons: [],
            },
        }),
        []
    );

    const snackbarButton = useMemo(
        () => ({
            action: () => {
                setMyEvents((prevEvents) => [...prevEvents, undoEvent]);
            },
            text: "Undo",
        }),
        [undoEvent]
    );

    const handleSnackbarClose = useCallback(() => {
        console.log("Snackbar is closing"); // 디버깅용 로그
        setSnackbarOpen(false);
    }, []);
    const myData = [
        { text: "이민규", value: 1 },
        { text: "고정한", value: 2 },
        { text: "변우석", value: 3 },
        { text: "이승엽", value: 4 },
        { text: "송건희", value: 5 },
        { text: "박태환", value: 6 },
        { text: "송지호", value: 7 },
        { text: "김뿡뿡", value: 8 },
        { text: "이뿌리", value: 9 },
    ];

    const customEventContent = useCallback((data) => {
        const workerCount = data.original.selectedWorker
            ? data.original.selectedWorker.length
            : 0;
        return (
            <>
                <div>{data.title}</div>
                <div className="md-custom-event-cont">
                    <div className="mbsc-custom-event-name">
                        <b> PM </b>: {data.original.selectedPM}
                    </div>
                    <div className="mbsc-custom-event-name">
                        <b> 작업자 </b> : {workerCount}
                    </div>
                </div>
            </>
        );
    }, []);

    const handlePMChange = useCallback((ev) => {
        setSelectedPM(ev.value);
    }, []);

    // 작업자 선택 핸들러
    const handleWorkerChange = useCallback((ev) => {
        setSelectedWorker(Array.isArray(ev.value) ? ev.value : [ev.value]);
    }, []);

    const titleChange = useCallback((ev) => {
        setTitle(ev.target.value);
    }, []);

    const selectChange = useCallback((ev) => {
        setSelect(ev.target.value);
    }, []);

    const allDayChange = useCallback((ev) => {
        setAllDay(ev.target.checked);
    }, []);

    const travelTimeChange = useCallback((ev) => {
        setTravelTime(ev.target.value);
    }, []);

    const dateChange = useCallback((args) => {
        setDate(args.value);
    }, []);

    const statusChange = useCallback((ev) => {
        setStatus(ev.target.value);
    }, []);

    const onDeleteClick = useCallback(() => {
        deleteEvent(tempEvent);
        setOpen(false);
    }, [deleteEvent, tempEvent]);

    // scheduler options

    const onSelectedDateChange = useCallback((event) => {
        setSelectedDate(event.date);
    }, []);

    const onEventClick = useCallback(
        (args) => {
            setEdit(true);
            setTempEvent({ ...args.event });
            // fill popup form with event data
            loadPopupForm(args.event);
            setAnchor(args.domEvent.target);
            setOpen(true);

            // 가져온 이벤트 객체에서 PM과 Worker 정보를 가져옵니다.
            const { selectedPM, selectedWorkerIds } = args.event;

            // 선택된 PM을 설정합니다.
            setSelectedPM(selectedPM);

            // 선택된 Worker IDs를 배열로 변환합니다.
            const workerIdsArray = selectedWorkerIds
                ? Object.values(selectedWorkerIds)
                : [];
            // 선택된 Worker IDs를 설정합니다.
            setSelectedWorker(workerIdsArray);
        },
        [loadPopupForm]
    );

    const onEventCreated = useCallback(
        (args) => {
            // createNewEvent(args.event, args.target)
            setEdit(false);
            setTempEvent(args.event);
            // fill popup form with event data
            loadPopupForm(args.event);
            setAnchor(args.target);
            // open the popup
            setOpen(true);
        },
        [loadPopupForm]
    );

    const onEventDeleted = useCallback(
        (args) => {
            deleteEvent(args.event);
        },
        [deleteEvent]
    );

    const onEventUpdated = useCallback(() => {
        // here you can update the event in your storage as well, after drag & drop or resize
        // ...
    }, []);

    // datepicker options
    const controls = useMemo(
        () => (popupEventAllDay ? ["date"] : ["datetime"]),
        [popupEventAllDay]
    );
    const datepickerResponsive = useMemo(
        () =>
            popupEventAllDay
                ? {
                      medium: {
                          controls: ["calendar"],
                          touchUi: false,
                      },
                  }
                : {
                      medium: {
                          controls: ["calendar", "time"],
                          touchUi: false,
                      },
                  },
        [popupEventAllDay]
    );

    // popup options
    const headerText = useMemo(
        () => (isEdit ? "Edit event" : "New Event"),
        [isEdit]
    );
    const popupButtons = useMemo(() => {
        if (isEdit) {
            return [
                "cancel",
                {
                    handler: () => {
                        saveEvent();
                    },
                    keyCode: "enter",
                    text: "Save",
                    cssClass: "mbsc-popup-button-primary",
                },
            ];
        } else {
            return [
                "cancel",
                {
                    handler: () => {
                        saveEvent();
                    },
                    keyCode: "enter",
                    text: "Add",
                    cssClass: "mbsc-popup-button-primary",
                },
            ];
        }
    }, [isEdit, saveEvent]);

    const popupResponsive = useMemo(
        () => ({
            medium: {
                display: "anchored",
                width: 400,
                fullScreen: false,
                touchUi: false,
            },
        }),
        []
    );

    const onClose = useCallback(() => {
        if (!isEdit) {
            // refresh the list, if add popup was canceled, to remove the temporary event
            setMyEvents([...myEvents]);
        }
        setOpen(false);
    }, [isEdit, myEvents]);

    const selectColor = useCallback((color) => {
        setTempColor(color);
    }, []);

    const openColorPicker = useCallback(
        (ev) => {
            selectColor(selectedColor || "");
            setColorAnchor(ev.currentTarget);
            setColorPickerOpen(true);
        },
        [selectColor, selectedColor]
    );

    const changeColor = useCallback(
        (ev) => {
            const selectedColor = ev.currentTarget.getAttribute("data-value"); // 선택된 컬러 가져오기
            setTempColor(selectedColor); // 임시 색상 설정
            setColor(selectedColor); // 선택된 컬러 저장
            if (!colorPicker.current.s.buttons.length) {
                setSelectedColor(selectedColor); // 선택된 컬러를 영구적으로 저장
                setColorPickerOpen(false);
            }
        },
        [setColor, setTempColor, setSelectedColor, colorPicker]
    );

    return (
        <>
            <div>{test !== undefined && <div>{test.id}</div>}</div>
            <Eventcalendar
                view={myView}
                data={events}
                renderEventContent={customEventContent}
                clickToCreate="double"
                dragToCreate={true}
                dragToMove={true}
                dragToResize={true}
                selectedDate={mySelectedDate}
                onSelectedDateChange={onSelectedDateChange}
                onEventClick={onEventClick}
                onEventCreated={onEventCreated}
                onEventDeleted={onEventDeleted}
                onEventUpdated={onEventUpdated}
            />
            <Popup
                display="anchored"
                fullScreen={true}
                contentPadding={false}
                headerText={headerText}
                anchor={anchor}
                buttons={popupButtons}
                isOpen={isOpen}
                onClose={onClose}
                responsive={popupResponsive}
            >
                <div className="mbsc-form-group">
                    <Input
                        label="현장명"
                        value={popupEventTitle}
                        onChange={titleChange}
                    />

                    <Select
                        label="PM"
                        data={myData}
                        display="center"
                        value={selectedPM}
                        onChange={handlePMChange}
                        touchUi={false}
                    />
                    <Select
                        label="작업자"
                        display="center"
                        data={myData}
                        value={selectedWorker}
                        onChange={handleWorkerChange}
                        selectMultiple={true}
                        touchUi={false}
                    />
                </div>
                <div className="mbsc-form-group">
                    <Input
                        ref={startRef}
                        label="Start & End"
                        placeholder="Please Select..."
                        value={
                            popupEventDate.length
                                ? `${new Date(
                                      popupEventDate[0]
                                  ).toLocaleDateString()} - ${new Date(
                                      popupEventDate[1]
                                  ).toLocaleDateString()}`
                                : ""
                        }
                    />

                    <Datepicker
                        select="range"
                        controls={["calendar"]}
                        touchUi={true}
                        display="anchored"
                        startInput={start}
                        endInput={end}
                        showRangeLabels={false}
                        responsive={datepickerResponsive}
                        onChange={dateChange}
                        value={popupEventDate}
                    />
                </div>

                <div onClick={openColorPicker} className="event-color-c">
                    <div className="event-color-label">Color</div>
                    <div
                        className="event-color"
                        style={{ background: selectedColor }}
                    ></div>
                </div>

                {isEdit ? (
                    <div className="mbsc-button-group">
                        <Button
                            className="mbsc-button-block"
                            color="danger"
                            variant="outline"
                            onClick={onDeleteClick}
                        >
                            Delete event
                        </Button>
                    </div>
                ) : null}
            </Popup>
            <Popup
                display="anchored"
                contentPadding={false}
                showArrow={false}
                showOverlay={false}
                anchor={colorAnchor}
                isOpen={colorPickerOpen}
                buttons={colorButtons}
                responsive={colorResponsive}
                ref={colorPicker}
                onClose={() => setColorPickerOpen(false)}
            >
                <div className="crud-color-row">
                    {colors.map((color, index) =>
                        index < 5 ? (
                            <div
                                key={index}
                                onClick={changeColor}
                                className={
                                    "crud-color-c " +
                                    (tempColor === color ? "selected" : "")
                                }
                                data-value={color}
                            >
                                <div
                                    className="crud-color mbsc-icon mbsc-font-icon mbsc-icon-material-check"
                                    style={{ background: color }}
                                ></div>
                            </div>
                        ) : null
                    )}
                </div>
                <div className="crud-color-row">
                    {colors.map((color, index) =>
                        index >= 5 ? (
                            <div
                                key={index}
                                onClick={changeColor}
                                className={
                                    "crud-color-c " +
                                    (tempColor === color ? "selected" : "")
                                }
                                data-value={color}
                            >
                                <div
                                    className="crud-color mbsc-icon mbsc-font-icon mbsc-icon-material-check"
                                    style={{ background: color }}
                                ></div>
                            </div>
                        ) : null
                    )}
                </div>{" "}
                <Toast
                    message={toastText}
                    isOpen={isToastOpen}
                    onClose={handleToastClose}
                />
            </Popup>
            <Snackbar
                isOpen={isSnackbarOpen}
                message="Event deleted"
                button={snackbarButton}
                onClose={handleSnackbarClose}
            />
        </>
    );
}

export default App;
