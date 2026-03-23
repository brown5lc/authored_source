type ClassCardProps = {
    className?: string;
};

export default function ClassCard({ className }: ClassCardProps){
    return(
        <div
        style={{
            //width: '80%',
            background: "#1e1e1e",
            padding: "16px",
            borderRadius: "12px",
        }} 
        >
            <h3>{className}</h3>
        </div>
    );
}