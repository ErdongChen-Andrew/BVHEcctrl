const Joystick = () => {

    const thumbPos = { x: 0, y: 0 };

    return (
        <div
            style={{
                position: "fixed",
                bottom: 40,
                left: 40,
                width: 100,
                height: 100,
                borderRadius: "50%",
                background: "#ccc",
                zIndex: 9999,
                touchAction: "none",
            }}
        >
            <div
                style={{
                    position: "absolute",
                    left: `calc(50% + ${thumbPos.x}px - 20px)`,
                    top: `calc(50% + ${thumbPos.y}px - 20px)`,
                    width: 40,
                    height: 40,
                    borderRadius: "50%",
                    background: "#555",
                }}
            />
        </div>
    )
}

export default Joystick