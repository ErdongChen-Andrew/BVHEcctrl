export default function Floor(props: any) {
  return (
      <mesh receiveShadow {...props}>
        <boxGeometry args={[300, 5, 300]} />
        <meshStandardMaterial color="lightgray" />
      </mesh>
  );
}
