// gridCells -> controls
export function convertGridToControls(gridCells) {
  const controls = {};

  for (let i = 0; i < gridCells.length; i++) {
    for (let j = 0; j < gridCells[i].length; j++) {
      const key = `${i}-${j}`;
      controls[key] = gridCells[i][j].indicator;
    }
  }

  return controls;
}

export function checkTarget(controls, target) {
  if (target === '3x1_1x3') return block_3x1_1x3(controls);
  else if (target === 'T') return block_T(controls);
  else if (target === '2x2') return block_2x2(controls);
  else if (target === 'K') return block_K(controls);
}

export function block_3x1_1x3(controls) {
    // 기능: controls 객체에서 3x1 또는 1x3 모양이 있는지 검사
    // 반환: "3x1", "1x3" 중 하나 또는 false

    // 0 0 0    0 
    //          0
    //          0

  const gridSize = 5;

  // 행 체크 (3x1)
  for (let j = 0; j < gridSize; j++) {
    const row = [];
    for (let i = 0; i < gridSize; i++) {
      const key = `${j}-${i}`;
      row[i] = controls[key] ?? false;
    }
    for (let i = 0; i <= gridSize - 3; i++) {
      if (row[i] && row[i + 1] && row[i + 2]) {
        return "3x1";
      }
    }
  }

  // 열 체크 (1x3)
  for (let i = 0; i < gridSize; i++) {
    const col = [];
    for (let j = 0; j < gridSize; j++) {
      const key = `${j}-${i}`;
      col[j] = controls[key] ?? false;
    }
    for (let j = 0; j <= gridSize - 3; j++) {
      if (col[j] && col[j + 1] && col[j + 2]) {
        return "1x3";
      }
    }
  }

  return false;
}

export function block_T(controls) {  
    // 기능: controls 객체에서 T자 모양이 있는지 검사
    // 반환: "up" (ㅜ), "down" (ㅗ), "right" (ㅓ), "left" (ㅏ) 중 하나 또는 false

    // 0 0 0
    //   0
    //   0

    
  const gridSize = 5;

  for (let j = 0; j < gridSize; j++) {
    for (let i = 0; i < gridSize; i++) {
      // ㅜ
      if (
        i >= 1 && i <= gridSize - 2 &&
        j <= gridSize - 3 &&
        controls[`${j}-${i - 1}`] &&
        controls[`${j}-${i}`] &&
        controls[`${j}-${i + 1}`] &&
        controls[`${j + 1}-${i}`] &&
        controls[`${j + 2}-${i}`]
      ) return "up";

      // ㅗ
      if (
        i >= 1 && i <= gridSize - 2 &&
        j <= gridSize - 3 &&
        controls[`${j}-${i}`] &&
        controls[`${j + 1}-${i}`] &&
        controls[`${j + 2}-${i - 1}`] &&
        controls[`${j + 2}-${i}`] &&
        controls[`${j + 2}-${i + 1}`]
      ) return "down";

      // ㅓ
      if (
        i <= gridSize - 2 &&
        j >= 1 && j <= gridSize - 2 &&
        controls[`${j}-${i}`] &&
        controls[`${j - 1}-${i + 1}`] &&
        controls[`${j}-${i + 1}`] &&
        controls[`${j + 1}-${i + 1}`] &&
        controls[`${j}-${i - 1}`]
      ) return "right";

      // ㅏ
      if (
        i >= 1 &&
        j >= 1 && j <= gridSize - 2 &&
        controls[`${j}-${i}`] &&
        controls[`${j - 1}-${i - 1}`] &&
        controls[`${j}-${i - 1}`] &&
        controls[`${j + 1}-${i - 1}`] &&
        controls[`${j}-${i + 1}`]
      ) return "left";
    }
  }

  return false;
}

export function block_2x2(controls) {
    // 기능: controls 객체에서 2x2자 모양이 있는지 검사
    // 반환: '2x2' 또는 false

    // 0 0 
    // 0 0 

  const gridSize = 5;

  for (let j = 0; j < gridSize - 1; j++) {
    for (let i = 0; i < gridSize - 1; i++) {
      if (
        controls[`${j}-${i}`] &&
        controls[`${j}-${i + 1}`] &&
        controls[`${j + 1}-${i}`] &&
        controls[`${j + 1}-${i + 1}`]
      ) {
        return '2x2';
      }
    }
  }

  return false;
}

export function block_K(controls) {
    // 기능: controls 객체에서 ㄱ자 모양이 있는지 검사
    // 반환: "ㄱ", "mirrored-ㄱ", "ㄴ", "mirrored-ㄴ" 중 하나 또는 false

    // 0 0 0
    //     0 
    //     0 

  const gridSize = 5;

  for (let j = 0; j < gridSize; j++) {
    for (let i = 0; i < gridSize; i++) {

      // ㄱ 모양
      if (
        i <= gridSize - 3 && j <= gridSize - 3 &&
        controls[`${j}-${i}`] &&
        controls[`${j}-${i + 1}`] &&
        controls[`${j}-${i + 2}`] &&
        controls[`${j + 1}-${i + 2}`] &&
        controls[`${j + 2}-${i + 2}`]
      ) return "ㄱ";

      // ㄴ 모양
      if (
        i >= 2 && j <= gridSize - 3 &&
        controls[`${j}-${i}`] &&
        controls[`${j}-${i - 1}`] &&
        controls[`${j}-${i - 2}`] &&
        controls[`${j + 1}-${i - 2}`] &&
        controls[`${j + 2}-${i - 2}`]
      ) return "mirrored-ㄱ";

      // mirrored-ㄱ (세로 3칸 + 아래 가로 오른쪽)
      if (
        j <= gridSize - 3 && i <= gridSize - 3 &&
        controls[`${j}-${i}`] &&
        controls[`${j + 1}-${i}`] &&
        controls[`${j + 2}-${i}`] &&
        controls[`${j + 2}-${i + 1}`] &&
        controls[`${j + 2}-${i + 2}`]
      ) return "ㄴ";

      // mirrored-ㄴ (세로 3칸 + 아래 가로 왼쪽)
      if (
        j <= gridSize - 3 && i >= 2 &&
        controls[`${j}-${i}`] &&
        controls[`${j + 1}-${i}`] &&
        controls[`${j + 2}-${i}`] &&
        controls[`${j + 2}-${i - 1}`] &&
        controls[`${j + 2}-${i - 2}`]
      ) return "mirrored-ㄴ";
    }
  }

  return false;
}
